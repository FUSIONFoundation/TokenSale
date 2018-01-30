pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/token/ERC20/StandardToken.sol';

contract FUSIONToken is StandardToken {

    string public name;
    string public symbol;
    uint8 public decimals;   

    function FUSIONToken(uint256 _initialSupply, string _tokenName, string _tokenSymbol, uint8 _decimals) public {
        totalSupply_ = _initialSupply;
        balances[msg.sender] = _initialSupply;
        name = _tokenName;
        symbol = _tokenSymbol;
        decimals = _decimals;
    }
}