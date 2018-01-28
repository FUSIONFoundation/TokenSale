pragma solidity ^0.4.18;

import './Ownable.sol';
import './Token.sol';
import './SafeMath.sol';


/**
 * @title ERC20 FSN Token Generation and Voluntary Participants Program
 * @dev see https://github.com/FusionFoundation/TokenSale
 */
contract ShareTokenSale is Ownable {

    using SafeMath for uint256;

    Token public token;
    address public receiverAddr;
    uint256 public totalSaleAmout;    
    uint256 public startTime;
    uint256 public endTime;    
    uint256[] public globalAmounts;    


    struct Stage {
        uint256 rate;
        uint256 duration;        
    }
    Stage[] public stages;

    struct PurchaserInfo {
        bool withdrew;        
        uint256[] amounts;
    }
    mapping(address => PurchaserInfo) public purchaserMapping;
    address[] public purchaserList;

    modifier onlyOpenTime {
        require(isStarted());
        require(!isEnded());
        _;
    }

    modifier olnyAutoWithdrawalTime {
         require(isEnded());
        _;
    }

    modifier olnyUserWithdrawalTime {
        require(isUserWithdrawalTime());
        _;
    }

    modifier olnyClearTime {
        require(isClearTime());
        _;
    }

    function ShareTokenSale(address _receiverAddr, address _tokenAddr, uint256 _totalSaleAmout, uint256 _startTime) public {
        require(_receiverAddr != address(0));
        require(_tokenAddr != address(0));
        require(_totalSaleAmout > 0);
        require(_startTime > 0);
        receiverAddr = _receiverAddr;
        token = Token(_tokenAddr);
        totalSaleAmout = _totalSaleAmout;       
        startTime = _startTime;        
    }

    function isStarted() public view returns(bool) {
        return 0 < startTime && startTime <= now && endTime != 0;
    }   

    function isEnded() public view returns(bool) {
        return now > endTime;
    }

    function isUserWithdrawalTime() public view returns(bool) {
        return now > endTime.add(1 days);
    }

    function isClearTime() public view returns(bool) {
        return now > endTime.add(7 days);
    }
    
    function startSale(uint256[] rates, uint256[] durations) public onlyOwner {
        require(endTime == 0);
        require(durations.length == rates.length);
        delete stages;
        endTime = startTime;
        for (uint i = 0; i < durations.length; i++) {
            uint256 rate = rates[i];
            uint256 duration = durations[i];
            stages.push(Stage({rate: rate, duration: duration}));
            endTime = endTime.add(duration);
            globalAmounts.push(0);
        }
    }
    
    function getCurrentStage() public view returns(uint) {
        int stageIndex = -1;
        uint stageEndTime = startTime;
        for (uint i = 0; i < stages.length; i++) {
            stageEndTime = stageEndTime.add(stages[i].duration);
            if (now <= stageEndTime) {
                stageIndex = int(i);
                break;
            }
        }
        assert(stageIndex >= 0 && uint(stageIndex) < stages.length);
        return uint(stageIndex);
    }

    function getPurchaserCount() public view returns(uint) {
        return purchaserList.length;
    }

    function getPurchaserInfo(address purchaser) public view returns(bool, uint[]) {
        PurchaserInfo storage pi = purchaserMapping[purchaser];
        return (pi.withdrew, pi.amounts);
    }
        
    function getProportion() public view returns (uint) {
        uint total = 0;
        for (uint i = 0; i < globalAmounts.length; i++) {
            total = total.add(globalAmounts[i].mul(stages[i].rate));   
        }
        uint proportion = totalSaleAmout.mul(1 ether).div(total);
        if (proportion > 1 ether) {
            proportion = 1 ether;
        }
        return proportion;
    }

    function getSaleInfo(address purchaser) public view returns (uint, uint, uint) {
        PurchaserInfo storage pi = purchaserMapping[purchaser];
        uint sendEther = 0;
        uint usedEther = 0;
        uint getToken = 0;
        uint proportion = getProportion();
        for (uint i = 0; i < pi.amounts.length; i++) {
            sendEther = sendEther.add(pi.amounts[i]);
            uint stageUsedEther = pi.amounts[i].mul(proportion).div(1 ether);
            uint stageGetToken = stageUsedEther.mul(stages[i].rate);
            if (stageGetToken > 0) {         
                getToken = getToken.add(stageGetToken);
                usedEther = usedEther.add(stageUsedEther);
            }
        }        
        return (sendEther, usedEther, getToken);
    }
    
    function () payable public {        
        buy();
    }
    
    function buy() payable public onlyOpenTime {
        require(msg.value > 0.1 ether);
        uint stageIndex = getCurrentStage();
        uint amount = msg.value;
        PurchaserInfo storage pi = purchaserMapping[msg.sender];
        if (pi.amounts.length == 0) {
            purchaserList.push(msg.sender);
        }    
        while (pi.amounts.length <= stageIndex) {
            pi.amounts.push(0);
        }
        pi.amounts[stageIndex] = pi.amounts[stageIndex].add(amount);
        globalAmounts[stageIndex] = globalAmounts[stageIndex].add(amount);
    }
    
    function _withdrawal(address purchaser) internal returns (bool) {
        require(purchaser != 0x0);
        PurchaserInfo storage pi = purchaserMapping[purchaser];        
        if (pi.withdrew) {
            return false;
        }
        var (sendEther, usedEther, getToken) = getSaleInfo(purchaser);
        receiverAddr.transfer(usedEther);
        token.transfer(purchaser, getToken);
        purchaser.transfer(sendEther.sub(usedEther));
        pi.withdrew = true;
        return true;
    }
    
    function withdrawal() payable public olnyUserWithdrawalTime {
        _withdrawal(msg.sender);
    }
    
    function withdrawalFor(address[] purchasers) payable public olnyAutoWithdrawalTime {
        for (uint i = 0; i < purchasers.length; i++) {
            _withdrawal(purchasers[i]);
        }
    }
    
    function withdrawalForAll() payable public olnyAutoWithdrawalTime {
        withdrawalFor(purchaserList);
    }
    
    function clear(uint tokenAmount, uint etherAmount) payable public olnyClearTime onlyOwner {
        token.transfer(receiverAddr, tokenAmount);
        receiverAddr.transfer(etherAmount);
    }
}