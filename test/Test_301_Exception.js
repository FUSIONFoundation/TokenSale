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
        "receiverAddr" : "0x48132E8f6f253B7Bab9E3BcFE7234209a0FB57A3",
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

contract('Exception Data test', function(accounts) {
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

    it("Send value shall be more than 0.1 ether", () => {
        return toknSaleInstance.startTime().then(time => {
            console.log("StartTime:", time.toNumber());
            //wating for starting
            return sleepSec(time.plus(2).sub(getUnixTime()).toNumber());
        })        
        .then(() => {
            console.log("Now:", getUnixTime());
            var hash  = web3.eth.sendTransaction({from: accounts[0], to: toknSaleInstance.address, value: convertDecimals(1), gas: gas});            
            var receipt = web3.eth.getTransactionReceipt(hash);            
            assert.equal(receipt.status, '0x01', "The Transaction will success");
            hash  = web3.eth.sendTransaction({from: accounts[0], to: toknSaleInstance.address, value: convertDecimals(0.1), gas: gas});
            receipt = web3.eth.getTransactionReceipt(hash); 
            assert.equal(receipt.status, '0x01', "The Transaction will success");
            hash  = web3.eth.sendTransaction({from: accounts[1], to: toknSaleInstance.address, value: convertDecimals(0.09), gas: gas});
            receipt = web3.eth.getTransactionReceipt(hash); 
            assert.equal(receipt.status, '0x00', "The Transaction will failure");
        })
    })

});

