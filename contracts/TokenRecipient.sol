pragma solidity ^0.4.18;

/**
 * @title TokenRecipient Interface
 * @dev for approveAndCall
 */
interface TokenRecipient {
    function receiveApproval(address _from, uint256 _value, address _token, bytes _extraData) public;
}
