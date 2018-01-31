/*

Used config

MNEMONIC
edit avoid behind drop fit mouse fly enable mandate world return circle



// 需要修改stages 里面的duration 以便快速测试
// 需要修改startTime 大概比当前时间晚2-3分钟 以便测试 未开始的流程
// 拷贝下列Config 到 config.json

{
    "token":{
        "totalSupply" : 57344000,
        "name" : "Fusion Token",
        "symbol" : "FSN",
        "decimals" : 18
    },
    "tokenSale":{
        "receiverAddr" : "0x48132E8f6f253B7Bab9E3BcFE7234209a0FB57A3", //accounts[9]
        "totalSaleAmount" : 204800,        
        "stages" : [
            {"rate": 420, "duration":120},
            {"rate": 400, "duration":120}
        ],
        "startTime" : 大概比当前时间晚 2-3分钟 的 unix时间戳,
        "userWithdrawalDelaySec" : 60,
        "clearDelaySec" : 60
    }
}




*/

var Token = artifacts.require("./FUSIONToken.sol");
var TokenSale = artifacts.require("./ShareTokenSale.sol");
var config = require("../config.json");
var tokenConfig = config.token;
var tokenSaleConfig = config.tokenSale;

var sleep = require('sleep-promise');
var Mock = require("mockjs");
var Random = Mock.Random;

var gas = 2000000;

function convertDecimals(number) {    
    return web3.toBigNumber(10).pow(tokenConfig.decimals).mul(number);
}

function getUnixTime(){
    return Math.round(new Date().getTime()/1000);
}

function sleepSec(sec){
    if(sec < 0){
        sec = 0;
    }
    console.log("Sleep :" + sec + " Sec");
    return sleep(sec * 1000); // sleep use ms
}

var sentData = {};

function randomSent(accounts, address, stage) {


    var account = accounts[Random.integer(0,accounts.length - 2)];
    var maxValue = web3.fromWei(web3.eth.getBalance(account)).sub(1);
    var minValue = 3;

    if(maxValue < minValue){
        return;
    }

    var value = Random.integer(minValue, maxValue);
    
    var isDo = Random.boolean();

    if(isDo){
        
      
        if(!sentData[account]) {
            sentData[account] = new Array();
            sentData[account][0] = 0;
            sentData[account][1] = 0;
        }
        sentData[account][stage] += value;
        value = convertDecimals(value);        
        var hash  = web3.eth.sendTransaction({from: account, to: address, value: value, gas: gas});            
        var receipt = web3.eth.getTransactionReceipt(hash);            
        assert.equal(receipt.status, '0x01', "The Transaction will success");
    }
}

contract('Random Data test', function(accounts) {
    var tokenInstance = null;
    var toknSaleInstance = null;

    it("Contract Token will deployed", () => {
        return Token.deployed()
        .then(instance => {
            tokenInstance = instance;
            assert.notEqual(tokenInstance, null);
        });
    });

    it("Contract TokenSale will deployed", () => {
        return TokenSale.deployed()
        .then(instance => {
            toknSaleInstance = instance;
            assert.notEqual(toknSaleInstance, null);
        });
    });

    it("Contract TokenSale Fiexd Data Will be correct", () => {
        return toknSaleInstance.startTime().then(time => {            
            console.log("StartTime:", time.toNumber());
            //wating for starting
            return sleepSec(time.plus(2).sub(getUnixTime()).toNumber());
            return toknSaleInstance.endTime();
        })        
        .then(() => {
            var times = Random.integer(10, 20);
            for(var i = 0; i < times; i++) {
                randomSent(accounts, toknSaleInstance.address, 0);
            }
            return toknSaleInstance.stages(0);
        })
        .then(stage => {            
             //wating for early bird to end
             return sleepSec(stage[1].plus(stage[2]).plus(2).sub(getUnixTime()).toNumber());
        })
        .then(() => {

            var times = Random.integer(10,20);
            for(var i = 0; i < times; i++) {
                randomSent(accounts, toknSaleInstance.address, 1);
            }
            return toknSaleInstance.endTime();
        })
        .then(time => {            
            console.log("EndTime:", time.toNumber());
            //wating for to end
            return sleepSec(time.plus(2).sub(getUnixTime()).toNumber());
        })
        .then(() => {                
            return toknSaleInstance.proportion();
        })
        .then(p => {
            var totalSale = 204800;
            var totalWannaBuy = 0
            for(var index in sentData){
                var element = sentData[index];                
                if(element[0]) {
                    totalWannaBuy += element[0] * 420;
                }
                if(element[1]){
                    totalWannaBuy += element[1] * 400;
                }
            }             
            var calcP = totalSale / totalWannaBuy;
            if(calcP > 1) {
                calcP = 1
            }                 
            console.log(p, calcP);            
        })
    });

});
