require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
    // --- 1. Setup provider and wallets ---
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const user = new ethers.Wallet(process.env.USER_PRIVATE_KEY, provider);
    const relayer = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);

    console.log("User address:", user.address);
    console.log("Relayer address:", relayer.address);

    // --- 3. Deploy Forwarder contract ---
    const ForwarderFactory = await ethers.getContractFactory("Forwarder", user);
    let forwarder;
    try {
        forwarder = await ForwarderFactory.deploy("MyForwarder");
        await forwarder.waitForDeployment();
        console.log("Forwarder deployed:", forwarder.target);
    } catch (err) {
        console.error("Forwarder deployment failed:", err);
        return;
    }

    // --- 4. Deploy Test recipient contract ---
    const TestFactory = await ethers.getContractFactory("Test", user);
    let recipient;
    try {
        recipient = await TestFactory.deploy(forwarder.target);
        await recipient.waitForDeployment();
        console.log("Recipient deployed:", recipient.target);
    } catch (err) {
        console.error("Recipient deployment failed:", err);
        return;
    }

    // --- 2. Check balances ---
    const userBalance = ethers.formatEther(await user.provider.getBalance(user.address))
    const relayerBalance = ethers.formatEther(await user.provider.getBalance(relayer.address))

    console.log("User balance before meta tx:", (userBalance));
    console.log("Relayer balance before meta tx:", (relayerBalance));
    // --- 5. Prepare meta-tx ---
    const data = recipient.interface.encodeFunctionData("setMessage", [
        "Hello! This is a meta-transaction",
    ]);

    const nonce = await forwarder.nonces(user.address);

    const request = {
        from: user.address,
        to: recipient.target,
        value: 0,
        gas: 1_000_000,
        nonce: parseInt(nonce.toString()),
        deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour
        data: data,
    };

    // --- 6. Prepare EIP-712 domain ---
    const chainId = (await provider.getNetwork()).chainId;
    const domain = {
        name: "MyForwarder",
        version: "1",
        chainId,
        verifyingContract: forwarder.target,
    };

    const types = {
        ForwardRequest: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "gas", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint48" },
            { name: "data", type: "bytes" },
        ],
    };

    // --- 7. Sign the request ---
    const signature = await user.signTypedData(domain, types, request);
    const requestWithSig = { ...request, signature };

    // Verify signature off-chain
    const recovered = ethers.verifyTypedData(domain, types, request, signature);
    if (recovered.toLowerCase() !== user.address.toLowerCase()) {
        throw new Error("Signature verification failed off-chain");
    }

    // --- 8. Execute meta-tx via relayer ---
    console.log("Relayer sending execute...");
    try {
        const tx = await forwarder
            .connect(relayer)
            .execute(requestWithSig, { value: request.value, gasLimit: request.gas });
        const receipt = await tx.wait();
        console.log("Meta-tx mined in tx:", receipt.hash);
    } catch (err) {
        console.error("Meta-tx execution failed:", err);
        return;
    }

    // --- 9. Show updated state ---
    const lastSender = await recipient.lastSender();
    const lastMsg = await recipient.lastMsg();

    console.log("lastSender:", lastSender);
    console.log("lastMsg:", lastMsg);

    // --- 10. Show final balances ---
    console.log(
        "User balance after meta-tx:",
        ethers.formatEther(await user.provider.getBalance(user.address))
    );
    console.log(
        "Relayer balance after meta-tx:",
        ethers.formatEther(await user.provider.getBalance(relayer.address))
    );
}

main().catch((err) => {
    console.error("Script failed:", err);
    process.exitCode = 1;
});
