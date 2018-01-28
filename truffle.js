var args = process.argv.splice(2);

function getPrivateKey(){
    for (var i = 0; i < args.length; i++){
        if (args[i].indexOf("--pk=") === 0){
            return args[i].substr(args[i].indexOf('=')+1);
        }
    }
    return "";
}


module.exports = {
  networks: {
    development: {
        host: "localhost",
        port: 7545,
        network_id: "*"
    },
    ropsten: {
        provider: function () {
            var WalletProvider = require('./TruffleWalletProvider');
            var privateKey = getPrivateKey();
            if(privateKey) {
                var ropstenProvider = new WalletProvider(privateKey, 'https://ropsten.infura.io/');
                console.log("--Ropsten Account Address:", ropstenProvider.getAddress());
                return ropstenProvider;
            }
        },
        gas: 4700000,
        gasPrice: 100000000000,
        network_id: 3
    },
    live: {
        provider: function () {
            var WalletProvider = require('./TruffleWalletProvider');
            var privateKey = getPrivateKey();
            if(privateKey) {
                var liveProvider = new WalletProvider(privateKey, 'https://mainnet.infura.io/');
                console.log("--Live Account Address:", liveProvider.getAddress());
                return liveProvider;
            }
        },
        gas: 6700000,
        network_id: 1
    }
  },

  solc: {
    optimizer: {
        enabled: true,
        runs: 200
    }
  }
};
