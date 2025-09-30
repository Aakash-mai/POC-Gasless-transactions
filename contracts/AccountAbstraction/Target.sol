// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Target {
    address public lastSender;
    string public lastMessage;
    event MessageSet(address indexed sender, string message);

    function setMessage(string calldata message) external {
        lastSender = msg.sender;
        lastMessage = message;
        emit MessageSet(msg.sender, message);
    }
}
