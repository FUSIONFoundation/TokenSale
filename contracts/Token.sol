pragma solidity ^0.4.18;


/**
 * @title ERC20 Token interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract Token {
    
    uint256 public totalSupply;
    string public name;
    string public symbol;
    uint8  public decimals;
    
    function balanceOf(address _owner) public view returns (uint256);
    function allowance(address _owner, address _spender) public view returns (uint256);


    function transfer(address _to, uint256 _value) public returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool);
    function approve(address _spender, uint256 _value) public returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}