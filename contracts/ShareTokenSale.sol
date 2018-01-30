pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/token/ERC20/ERC20.sol';


/**
 * @title ERC20 FSN Token Generation and Voluntary Participants Program
 * @dev see https://github.com/FusionFoundation/TokenSale
 */
contract ShareTokenSale is Ownable {

    using SafeMath for uint256;

    ERC20 public token;
    address public receiverAddr;
    uint256 public totalSaleAmount;    
    uint256 public startTime;
    uint256 public endTime;
    uint256 public proportion;
    mapping(uint256 => uint256) globalAmounts;    


    struct Stage {
        uint256 rate;
        uint256 duration;
        uint256 startTime;       
    }
    Stage[] public stages;    


    struct PurchaserInfo {
        bool withdrew;
        bool recorded;
        mapping(uint256 => uint256) amounts;
    }
    mapping(address => PurchaserInfo) public purchaserMapping;
    address[] public purchaserList;

    modifier onlyOpenTime {
        require(isStarted());
        require(!isEnded());
        _;
    }

    modifier onlyAutoWithdrawalTime {
         require(isEnded());
        _;
    }

    modifier onlyUserWithdrawalTime {
        require(isUserWithdrawalTime());
        _;
    }

    modifier onlyClearTime {
        require(isClearTime());
        _;
    }

    function ShareTokenSale(address _receiverAddr, address _tokenAddr, uint256 _totalSaleAmount, uint256 _startTime) public {
        require(_receiverAddr != address(0));
        require(_tokenAddr != address(0));
        require(_totalSaleAmount > 0);
        require(_startTime > 0);
        receiverAddr = _receiverAddr;
        token = ERC20(_tokenAddr);
        totalSaleAmount = _totalSaleAmount;       
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
        return now > endTime.add(15 days);
    }
    
    function startSale(uint256[] rates, uint256[] durations) public onlyOwner {
        require(endTime == 0);
        require(durations.length == rates.length);
        delete stages;
        endTime = startTime;
        for (uint i = 0; i < durations.length; i++) {
            uint256 rate = rates[i];
            uint256 duration = durations[i];            
            stages.push(Stage({rate: rate, duration: duration, startTime:endTime}));
            endTime = endTime.add(duration);
        }
    }
    
    function getCurrentStage() public onlyOpenTime view returns(uint) {
        for (uint i = stages.length - 1; i >= 0; i--) {
            if (now >= stages[i].startTime) {
                return i;
            }
        }
    }

    function getGlobalAmount(uint256 index) public view returns(uint) {
        return globalAmounts[index];
    }

    function getPurchaserCount() public view returns(uint) {
        return purchaserList.length;
    }


    function calcProportion() public view returns (uint) {
        uint total = 0;
        for (uint i = 0; i < stages.length; i++) {
            total = total.add(globalAmounts[i].mul(stages[i].rate));   
        }
        uint nowProportion = totalSaleAmount.mul(1 ether).div(total);
        if (nowProportion > 1 ether) {
            nowProportion = 1 ether;
        }
        return nowProportion;
    }

    function getProportion() public view returns (uint) {
        if (proportion > 0) {
            return proportion;
        }
        return calcProportion();
    }

    function setProportion() public onlyAutoWithdrawalTime onlyOwner {
        require(proportion==0);
        proportion = calcProportion();
    }

    function getSaleInfo(address purchaser) public view returns (uint, uint, uint) {
        PurchaserInfo storage pi = purchaserMapping[purchaser];
        uint sendEther = 0;
        uint usedEther = 0;
        uint getToken = 0;
        uint nowProportion = getProportion();
        for (uint i = 0; i < stages.length; i++) {
            sendEther = sendEther.add(pi.amounts[i]);
            uint stageUsedEther = pi.amounts[i].mul(nowProportion).div(1 ether);
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
        if (!pi.recorded) {
            pi.recorded = true;
            purchaserList.push(msg.sender);
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
        pi.withdrew = true;
        var (sendEther, usedEther, getToken) = getSaleInfo(purchaser);
        receiverAddr.transfer(usedEther);
        token.transfer(purchaser, getToken);
        purchaser.transfer(sendEther.sub(usedEther));        
        return true;
    }
    
    function withdrawal() payable public onlyUserWithdrawalTime {
        _withdrawal(msg.sender);
    }
    
    function withdrawalFor(uint index, uint stop) payable public onlyAutoWithdrawalTime onlyOwner {
        for (; index < stop; index++) {
            _withdrawal(purchaserList[index]);
        }
    }
    
    function clear(uint tokenAmount, uint etherAmount) payable public onlyClearTime onlyOwner {
        token.transfer(receiverAddr, tokenAmount);
        receiverAddr.transfer(etherAmount);
    }
}