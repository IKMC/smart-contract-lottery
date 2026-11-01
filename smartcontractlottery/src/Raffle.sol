// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IReceiver} from "./interfaces/IReceiver.sol";

/**
 * @title A simple raffle contract
 * @author Ismail Kabir Magaji
 * @notice Raffle drawn with Chainlink VRF v2.5 and automated by a Chainlink CRE cron workflow
 * @dev CRE delivers reports through the KeystoneForwarder, which calls onReport().
 *      We implement IReceiver directly instead of ReceiverTemplate, because
 *      ReceiverTemplate brings OpenZeppelin Ownable and VRFConsumerBaseV2Plus
 *      already brings ConfirmedOwner (two owner implementations would clash).
 */
contract Raffle is VRFConsumerBaseV2Plus, IReceiver {
    /**
     * Enums
     */
    enum RaffleState {
        OPEN,
        CALCULATING
    }

    /**
     * State Variables
     */
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    uint256 private constant RESET_TIMEOUT = 1 hours;

    // Report actions (first and only field of the ABI-encoded report)
    uint8 private constant ACTION_DRAW = 1;
    uint8 private constant ACTION_RESET = 2;

    // DrawSkipped reasons
    uint8 private constant SKIP_NOT_OPEN = 1;
    uint8 private constant SKIP_INTERVAL = 2;
    uint8 private constant SKIP_NO_PLAYERS = 3;
    uint8 private constant SKIP_RESET_NOT_ALLOWED = 4;

    uint32 private immutable CALLBACK_GAS_LIMIT;
    uint256 private immutable I_ENTRANCE_FEE;
    uint256 private immutable INTERVAL;
    bytes32 private immutable KEY_HASH;
    uint256 private immutable SUBSCRIPTION_ID;
    address private immutable I_FORWARDER;

    address payable[] private players;
    uint256 private lastTimeStamp;
    uint256 private requestTimestamp;
    uint256 private lastRequestId;
    uint256 private pot;
    address payable private recentWinner;
    RaffleState private raffleState;
    mapping(address winner => uint256 amount) private winnings;

    /**
     * Events
     */
    event RaffleEntered(address indexed player, uint256 amount);
    event WinnerPicked(address indexed winner, uint256 amount);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event DrawSkipped(uint8 reason);
    event RaffleReset(uint256 indexed requestId);
    event WinningsWithdrawn(address indexed winner, uint256 amount);

    /**
     * Custom Errors
     */
    error Raffle__NotEnoughETHEntered();
    error Raffle__IntervalNotPassed(
        uint256 currentTime,
        uint256 lastTimeStamp,
        uint256 interval
    );
    error Raffle__TransferFailed();
    error Raffle__RaffleNotOpen();
    error Raffle__NoPlayersInRaffle();
    error Raffle__InvalidSender(address sender, address expected);
    error Raffle__InvalidAction(uint8 action);
    error Raffle__ResetNotAllowed();
    error Raffle__NothingToWithdraw();

    /**
     * Constructor
     * @param _entranceFee The entrance fee for the raffle
     * @param _interval The interval for the raffle
     * @param _vrfCoordinator The address of the VRF Coordinator
     * @param _gasLane The gas lane to use, which specifies the maximum gas price
     * @param _subscriptionId The subscription ID that this contract uses for funding requests
     * @param _callbackGasLimit The gas limit for the callback request to fulfillRandomWords
     * @param _forwarder The CRE forwarder allowed to call onReport (mock forwarder for simulation)
     */
    constructor(
        uint256 _entranceFee,
        uint256 _interval,
        address _vrfCoordinator,
        bytes32 _gasLane,
        uint256 _subscriptionId,
        uint32 _callbackGasLimit,
        address _forwarder
    ) VRFConsumerBaseV2Plus(_vrfCoordinator) {
        I_ENTRANCE_FEE = _entranceFee;
        INTERVAL = _interval;
        KEY_HASH = _gasLane;
        SUBSCRIPTION_ID = _subscriptionId;
        CALLBACK_GAS_LIMIT = _callbackGasLimit;
        I_FORWARDER = _forwarder;
        lastTimeStamp = block.timestamp;
        raffleState = RaffleState.OPEN;
    }

    function enterRaffle() external payable {
        if (msg.value < I_ENTRANCE_FEE) {
            revert Raffle__NotEnoughETHEntered();
        }
        if (raffleState != RaffleState.OPEN) {
            revert Raffle__RaffleNotOpen();
        }

        players.push(payable(msg.sender));
        pot += msg.value;
        emit RaffleEntered(msg.sender, msg.value);
    }

    /**
     * @notice Permissionless fallback: anyone may start the draw once it is due.
     * @dev Safe because every precondition is checked on-chain. The CRE cron
     *      workflow is the normal path (see onReport).
     */
    function pickWinner() external {
        uint8 reason = _drawBlocker();
        if (reason == SKIP_NOT_OPEN) revert Raffle__RaffleNotOpen();
        if (reason == SKIP_INTERVAL) {
            revert Raffle__IntervalNotPassed(
                block.timestamp,
                lastTimeStamp,
                INTERVAL
            );
        }
        if (reason == SKIP_NO_PLAYERS) revert Raffle__NoPlayersInRaffle();

        _requestWinner();
    }

    /**
     * @notice Escape hatch: re-open a raffle whose VRF callback never arrived.
     * @dev Players and the pot are kept, so they take part in the next draw.
     */
    function resetStuckRaffle() external {
        if (!_canReset()) revert Raffle__ResetNotAllowed();
        _reset();
    }

    /**
     * @notice Pull payment: winners withdraw their prize themselves.
     * @dev A winner that rejects ETH can no longer lock the raffle.
     */
    function withdrawWinnings() external {
        uint256 amount = winnings[msg.sender];
        if (amount == 0) revert Raffle__NothingToWithdraw();

        winnings[msg.sender] = 0;
        emit WinningsWithdrawn(msg.sender, amount);

        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert Raffle__TransferFailed();
    }

    /**
     * CRE entry point
     */

    /// @inheritdoc IReceiver
    /// @dev Only the configured forwarder may call. Unready states are skipped
    ///      (event, no revert): a revert can be retried by the forwarder but
    ///      "not ready" will never succeed on retry, so skipping is cleaner.
    function onReport(
        bytes calldata /* metadata */,
        bytes calldata report
    ) external override {
        if (msg.sender != I_FORWARDER) {
            revert Raffle__InvalidSender(msg.sender, I_FORWARDER);
        }

        uint8 action = abi.decode(report, (uint8));

        if (action == ACTION_DRAW) {
            uint8 reason = _drawBlocker();
            if (reason != 0) {
                emit DrawSkipped(reason);
                return;
            }
            _requestWinner();
        } else if (action == ACTION_RESET) {
            if (!_canReset()) {
                emit DrawSkipped(SKIP_RESET_NOT_ALLOWED);
                return;
            }
            _reset();
        } else {
            revert Raffle__InvalidAction(action);
        }
    }

    /// @inheritdoc IERC165
    function supportsInterface(
        bytes4 interfaceId
    ) public pure override returns (bool) {
        return
            interfaceId == type(IReceiver).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }

    /**
     * Internal logic
     */

    /// @return 0 if a draw can start now, otherwise a SKIP_* reason code
    function _drawBlocker() internal view returns (uint8) {
        if (raffleState != RaffleState.OPEN) return SKIP_NOT_OPEN;
        if ((block.timestamp - lastTimeStamp) < INTERVAL) return SKIP_INTERVAL;
        if (players.length == 0) return SKIP_NO_PLAYERS;
        return 0;
    }

    function _requestWinner() internal {
        raffleState = RaffleState.CALCULATING;
        requestTimestamp = block.timestamp;

        uint256 requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: KEY_HASH,
                subId: SUBSCRIPTION_ID,
                requestConfirmations: REQUEST_CONFIRMATIONS,
                callbackGasLimit: CALLBACK_GAS_LIMIT,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );

        lastRequestId = requestId;
        emit RequestedRaffleWinner(requestId);
    }

    function _canReset() internal view returns (bool) {
        return
            raffleState == RaffleState.CALCULATING &&
            block.timestamp >= requestTimestamp + RESET_TIMEOUT;
    }

    function _reset() internal {
        uint256 staleRequestId = lastRequestId;
        // A late fulfilment of the abandoned request will now be ignored.
        lastRequestId = 0;
        raffleState = RaffleState.OPEN;
        emit RaffleReset(staleRequestId);
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords
    ) internal override {
        // Ignore stale or duplicate callbacks instead of reverting.
        if (
            requestId != lastRequestId || raffleState != RaffleState.CALCULATING
        ) {
            return;
        }

        address payable winner = players[randomWords[0] % players.length];
        uint256 amountWon = pot;

        recentWinner = winner;
        winnings[winner] += amountWon;
        pot = 0;
        delete players;
        lastTimeStamp = block.timestamp;
        raffleState = RaffleState.OPEN;

        emit WinnerPicked(winner, amountWon);
    }

    /**
     * Getter Functions
     */
    function getEntranceFee() external view returns (uint256) {
        return I_ENTRANCE_FEE;
    }
    function getPlayers(uint256 index) external view returns (address payable) {
        return players[index];
    }
    function getNumberOfPlayers() external view returns (uint256) {
        return players.length;
    }
    function getRecentWinner() external view returns (address payable) {
        return recentWinner;
    }
    function getRaffleState() external view returns (RaffleState) {
        return raffleState;
    }
    function getInterval() external view returns (uint256) {
        return INTERVAL;
    }
    function getLastTimeStamp() external view returns (uint256) {
        return lastTimeStamp;
    }
    function getWinnings(address winner) external view returns (uint256) {
        return winnings[winner];
    }
    function getForwarder() external view returns (address) {
        return I_FORWARDER;
    }
}
