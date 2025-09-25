require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.26",
  networks: {
    amoy: {
      url: process.env.RPC_URL,
      accounts: [process.env.USER_PRIVATE_KEY, process.env.RELAYER_PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      polygonAmoy: process.env.EXPLORER_API_KEY,
    },
  },
};  
