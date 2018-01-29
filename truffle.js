module.exports = {
  networks: {
    development: {
        host: "localhost",
        port: 7545,
        network_id: "*"
    },
    live: {
        host: "localhost",
        port: 8545,
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
