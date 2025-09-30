// scripts/bundler.js
const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    const [relayer, user] = await ethers.getSigners();

    const ENTRYPOINT = process.env.ENTRY_POINT;
    const SMARTWALLET = process.env.SMART_WALLET;
    const TARGET = process.env.TARGET_CONTRACT;

    if (!ENTRYPOINT || !SMARTWALLET || !TARGET) {
        console.error("Please set ENTRY_POINT, SMART_WALLET, TARGET_CONTRACT env vars");
        process.exit(1);
    }

    const entryPoint = await ethers.getContractAt("EntryPoint", ENTRYPOINT, relayer);
    const smartWallet = SMARTWALLET;
    const target = await ethers.getContractAt("Target", TARGET, relayer);

    console.log("EntryPoint:", entryPoint.target);
    console.log("Account:", smartWallet);
    console.log("Target:", target.target);
    console.log("User (owner):", user.address);
    console.log("Relayer:", relayer.address);

    // Build the inner target function call (Target.setMessage(string))
    const ifaceTarget = new ethers.Interface(["function setMessage(string)"]);
    const targetData = ifaceTarget.encodeFunctionData("setMessage", ["Hello from ERC-4337 POC via EIP-712!"]);

    // callData for account.execute: abi.encode(target, value, data)
    const callData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256", "bytes"],
        [target.target, 0, targetData]
    );

    // get nonce from account
    const acct = await ethers.getContractAt("SmartWallet", smartWallet, relayer);
    const nonce = await acct.nonce();
    console.log("Account nonce:", nonce);

    // compute dataHash
    const dataHash = ethers.keccak256(callData);

    // Domain for EIP-712 MUST match EntryPoint constructor values
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const domain = {
        name: "EntryPoint",
        version: "1",
        chainId: chainId,
        verifyingContract: entryPoint.target
    };
    console.log("EIP-712 domain:", domain);
    // Types must match the solidity _USEROP_TYPEHASH
    const types = {
        UserOp: [
            { name: "sender", type: "address" },
            { name: "nonce", type: "uint256" },
            { name: "dataHash", type: "bytes32" }
        ]
    };

    // Message (values) that match solidity encoding order
    const message = {
        sender: smartWallet,
        nonce: nonce,
        dataHash: dataHash
    };
    console.log("EIP-712 message:", message);
    // Sign the typed data with the user's signer
    const signature = await user.signTypedData(domain, types, message);
    console.log("Signature:", signature);

    // Build userOp
    const userOp = {
        sender: smartWallet,
        nonce: nonce,
        callData: callData,
        callGas: 1_000_000,
        signature: signature
    };

    // Submit to EntryPoint
    console.log("Submitting UserOperation via EntryPoint.handleOps ...");
    const tx = await entryPoint.connect(relayer).handleOps([userOp], relayer.address, { gasLimit: 3_000_000 });
    const receipt = await tx.wait();
    console.log("handleOps tx:", receipt.hash
    );

    // parse logs for UserOpEvent
    const entryPointIface = new ethers.Interface([
        "event UserOpEvent(address indexed sender, bytes32 reqHash, bool success)"
    ]);

    for (const log of receipt.logs) {
        try {
            const parsed = entryPointIface.parseLog(log);
            console.log("UserOpEvent:", parsed.args);
        } catch (e) {
            // ignore unrelated logs
        }
    }

    // Check target state
    const lastSender = await target.lastSender();
    const lastMsg = await target.lastMessage ? await target.lastMessage() : await target.lastMessage;
    console.log("Target lastSender:", lastSender);
    console.log("Target lastMessage:", lastMsg);
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
