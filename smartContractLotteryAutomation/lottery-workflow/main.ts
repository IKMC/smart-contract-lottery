import {
  CronCapability,
  EVMClient,
  Runner,
  TxStatus,
  LATEST_BLOCK_NUMBER,
  bytesToHex,
  encodeCallMsg,
  getNetwork,
  handler,
  hexToBase64,
  type Runtime,
} from "@chainlink/cre-sdk"
import {
  decodeFunctionResult,
  encodeAbiParameters,
  encodeFunctionData,
  parseAbiParameters,
  zeroAddress,
  isAddress,
} from "viem"

type Config = {
  schedule: string
  evms: Array<{
    raffleAddress: string
    chainSelectorName: string
    gasLimit: string
  }>
}

// Must match ACTION_DRAW / ACTION_RESET in Raffle.sol
const ACTION_DRAW = 1

// Only the view functions this workflow reads.
const RAFFLE_ABI = [
  { name: "getRaffleState", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
  { name: "getNumberOfPlayers", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "getLastTimeStamp", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "getInterval", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
] as const

type ReadFn = (typeof RAFFLE_ABI)[number]["name"]

// One EVM read of a no-argument view function, returned as a bigint.
// LATEST_BLOCK_NUMBER keeps the view fresh. LAST_FINALIZED_BLOCK_NUMBER is
// safer but lags ~13 minutes on Sepolia, which would hide new players and
// completed draws. The contract re-checks everything anyway.
const readRaffle = (
  runtime: Runtime<Config>,
  client: EVMClient,
  raffle: `0x${string}`,
  functionName: ReadFn,
): bigint => {
  const reply = client
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: raffle,
        data: encodeFunctionData({ abi: RAFFLE_ABI, functionName }),
      }),
      blockNumber: LATEST_BLOCK_NUMBER,
    })
    .result()

  const decoded = decodeFunctionResult({
    abi: RAFFLE_ABI,
    functionName,
    data: bytesToHex(reply.data),
  })
  return BigInt(decoded as number | bigint)
}

const onCronTrigger = (runtime: Runtime<Config>): string => {

  const evm = runtime.config.evms?.[0]
  if (!evm || !isAddress(evm.raffleAddress)) {
  throw new Error(
    `Bad config: evms[0].raffleAddress missing or not a valid address. Got: ${JSON.stringify(runtime.config)}`,
  )
  }
  const raffle = evm.raffleAddress as `0x${string}`

  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: evm.chainSelectorName,
    isTestnet: true,
  })
  if (!network) {
    throw new Error(`Network not found: ${evm.chainSelectorName}`)
  }
  const client = new EVMClient(network.chainSelector.selector)

  // 1. READ ------------------------------------------------------------
  const state = readRaffle(runtime, client, raffle, "getRaffleState")
  const players = readRaffle(runtime, client, raffle, "getNumberOfPlayers")
  const lastTimeStamp = readRaffle(runtime, client, raffle, "getLastTimeStamp")
  const interval = readRaffle(runtime, client, raffle, "getInterval")
  const nowSec = BigInt(Math.floor(runtime.now().getTime() / 1000))

  runtime.log(
    `Raffle state=${state} players=${players} last=${lastTimeStamp} interval=${interval} now=${nowSec}`,
  )

  // 2. DECIDE ----------------------------------------------------------
  // Skipping here saves a transaction. Raffle.onReport re-checks all of this
  // on-chain, so a stale read can never cause a wrong draw.
  if (state !== 0n) return "Skipped: raffle is not OPEN"
  if (players === 0n) return "Skipped: no players"
  if (nowSec < lastTimeStamp + interval) {
    return `Skipped: interval not passed (${lastTimeStamp + interval - nowSec}s left)`
  }

  // 3. WRITE -----------------------------------------------------------
  // Report payload = abi.encode(uint8 action), decoded in Raffle.onReport.
  const reportData = encodeAbiParameters(parseAbiParameters("uint8 action"), [ACTION_DRAW])

  const report = runtime
    .report({
      encodedPayload: hexToBase64(reportData),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result()

  const write = client
    .writeReport(runtime, {
      receiver: evm.raffleAddress,
      report,
      gasConfig: { gasLimit: evm.gasLimit },
    })
    .result()

  if (write.txStatus === TxStatus.SUCCESS) {
    const txHash = bytesToHex(write.txHash || new Uint8Array(32))
    runtime.log(`Draw requested. tx: ${txHash}`)
    return `Draw requested: ${txHash}`
  }

  throw new Error(`writeReport failed with status ${write.txStatus}`)
}

const initWorkflow = (config: Config) => {
  const cron = new CronCapability()
  return [handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)]
}

export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}

main()