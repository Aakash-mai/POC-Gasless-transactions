// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

/// @notice Example recipient that supports ERC-2771 meta-transactions.
contract Test is ERC2771Context {
    // store last sender and last message to make assertions clear
    address public lastSender;
    string public lastMsg;

    constructor(address trustedForwarder) ERC2771Context(trustedForwarder) {}

    /// @notice Set last message and last sender using _msgSender()
    function setMessage(string calldata message) external {
        address sender = _msgSender();
        lastSender = sender;
        lastMsg = message;
    }

    // explicit overrides to satisfy solidity requirements — delegate to OZ
    function _msgSender() internal view override(ERC2771Context) returns (address) {
        return ERC2771Context._msgSender();
    }

    function _msgData() internal view override(ERC2771Context) returns (bytes calldata) {
        return ERC2771Context._msgData();
    }
}
