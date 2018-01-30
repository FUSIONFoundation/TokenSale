/*
Any Config
*/



var Token = artifacts.require("./FUSIONToken.sol");
var TokenSale = artifacts.require("./ShareTokenSale.sol");
var config = require("../config.json");
var tokenConfig = config.token;
var tokenSaleConfig = config.tokenSale;

function convertDecimals(number) {    
    return web3.toBigNumber(10).pow(tokenConfig.decimals).mul(number);
}

function getReceiverAddr(defaultAddr) {
    if(tokenSaleConfig.receiverAddr) {
        return tokenSaleConfig.receiverAddr;
    }
    return defaultAddr;
}


contract('Initial test', function(accounts) {

    
    var defaultAddr = accounts[0];
    var receiverAddr = getReceiverAddr(defaultAddr);    
    var totalSaleAmount = convertDecimals(tokenSaleConfig.totalSaleAmount);
    var totalSupply = convertDecimals(tokenConfig.totalSupply);
    var startTime = web3.toBigNumber(tokenSaleConfig.startTime);
    var keepAmount = totalSupply.sub(totalSaleAmount);  
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

    it("Token Info will correct", () => {
        return tokenInstance.name()
        .then(name => {
            console.log('name:', name);
            assert.equal(name, tokenConfig.name);
            return tokenInstance.symbol();
        })
        .then(symbol => {
            console.log('symbol:', symbol);
            assert.equal(symbol, tokenConfig.symbol);
            return tokenInstance.decimals();
        })
        .then(decimals => {
            console.log('decimals:', decimals);
            assert(decimals.equals(tokenConfig.decimals));
            return tokenInstance.totalSupply();
        })
        .then(totalSupply => {
            console.log('totalSupply:', totalSupply);
            assert(totalSupply.equals(totalSupply));            
        });
    });

    it("Sale Info will correct", () => {
        return toknSaleInstance.token()
        .then(address => {
            console.log('Token Address:', address);
            assert.equal(address, tokenInstance.address);


            return toknSaleInstance.receiverAddr()        
        })
        .then(address => {
            console.log('Receiver Address:', address);            
            assert.equal(address.toLowerCase(), receiverAddr.toLowerCase());


            return toknSaleInstance.totalSaleAmount()   
        })
        .then(Amount => {
            console.log('Total Sale Amount:', Amount);
            assert(Amount.equals(totalSaleAmount));


            return toknSaleInstance.startTime()   
        })
        .then(time => {
            console.log('Start Time:', time);
            assert(time.equals(startTime));


            var promises = [];
            promises.push(toknSaleInstance.endTime());
            promises.push(toknSaleInstance.userWithdrawalStartTime());
            promises.push(toknSaleInstance.clearStartTime());
            return Promise.all(promises);  
        })
        .then(times => {
            console.log('End Time:', times[0]);
            console.log('UserWithdrawalStartTime:', times[1]);
            console.log('ClearStartTime:', times[2]);
            var endTime = web3.toBigNumber(startTime.toNumber());            
            tokenSaleConfig.stages.forEach(element => {
                endTime = endTime.plus(element.duration);
            });

            assert(times[0].equals(endTime));
            assert(times[1].equals(endTime.plus(tokenSaleConfig.userWithdrawalDelaySec)));
            assert(times[2].equals(endTime.plus(tokenSaleConfig.clearDelaySec)));

            var promises = [];
            for(var i = 0; i < tokenSaleConfig.stages.length; i++){
                promises.push(toknSaleInstance.globalAmounts(i));
            }
            return Promise.all(promises);
        })
        .then(Amounts => {
            console.log('Global Amounts:',Amounts);  
            for(var i = 0; i < Amounts.length; i++){
                assert(Amounts[i].equals(0));
            }


            var promises = [];
            for(var i = 0; i < tokenSaleConfig.stages.length; i++){
                promises.push(toknSaleInstance.stages(i));
            }
            return Promise.all(promises);
        })
        .then(stages => {             
            for(var i = 0; i < stages.length; i++){
                console.log('Stage ' + i + ':',stages[i]);
                assert(stages[i][0].equals(tokenSaleConfig.stages[i].rate));
                assert(stages[i][1].equals(tokenSaleConfig.stages[i].duration));
            }


            return toknSaleInstance.getPurchaserCount();
        })
        .then(count => {
            console.log('Purchaser Count:', count);
            assert(count.equals(0));
        });
    });

    it("Token Balance will correct", () => {
        var total = web3.toBigNumber(0);
        return tokenInstance.balanceOf(receiverAddr)
        .then(balance => {
            console.log('Keep Balance:', balance);
            assert(balance.equals(keepAmount));
            total = total.add(keepAmount);
            return tokenInstance.balanceOf(toknSaleInstance.address)
        })
        .then(balance => {
            console.log('Sale Balance:', balance);
            assert(balance.equals(totalSaleAmount));
            total = total.add(totalSaleAmount);
            console.log('Total Balance:', total);
            assert(total.equals(totalSupply));       
        })
    });
});