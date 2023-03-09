const localnet_accounts = [
  {
    name: 'admin',
    address: 'juno10qkg67l8eq5khau8dt83cd3s269zmm3j0nzsmx',
    mnemonic: 'thought notice weather fork same gather pair song priority predict ignore interest rose dress few buddy rival ready high bubble okay remember later dwarf'
  },
  {
    name: 'account_1',
    address: 'juno15vg74rhwuewmnwj9rrnwhyes9fyxxfx3n75fxd',
    mnemonic: 'crystal crystal invite wink voyage awesome fiber pioneer cable mistake crisp search wine mountain resource allow equal cram shy hand visa second permit inside'
  },
  {
    name: 'account_2',
    address: 'juno13xuzkleg37sypr5uu22g7z28vt58yny0vzgfnf',
    mnemonic: 'area inmate stamp jacket cousin cloud remember unique attitude trim sniff canvas decide mercy arch abandon health powder mercy fame gain bubble hour satoshi'
  },
];

const testnet_accounts = [
  {
    name: 'admin',
    address: 'juno1evpfprq0mre5n0zysj6cf74xl6psk96gus7dp5',
    mnemonic: 'omit sphere nurse rib tribe suffer web account catch brain hybrid zero act gold coral shell voyage matter nose stick crucial fog judge text'
  },
  {
    name: 'account_1',
    address: 'juno1njamu5g4n0vahggrxn4ma2s4vws5x4w3u64z8h',
    mnemonic: 'student prison fresh dwarf ecology birth govern river tissue wreck hope autumn basic trust divert dismiss buzz play pistol focus long armed flag bicycle'
  },
  {
    name: 'account_2',
    address: 'juno13xuzkleg37sypr5uu22g7z28vt58yny0vzgfnf',
    mnemonic: 'area inmate stamp jacket cousin cloud remember unique attitude trim sniff canvas decide mercy arch abandon health powder mercy fame gain bubble hour satoshi'
  },
];
const mainnet_accounts = [

];

const networks = {
  mainnet: {
    endpoint: ' https://rpc-juno.itastakers.com:443/',
    accounts: mainnet_accounts,
    fees: {
      upload: {
        amount: [{ amount: "100000", denom: "ujuno" }],
        gas: "50000000",
      },
      init: {
        amount: [{ amount: "50000", denom: "ujuno" }],
        gas: "25000000",
      },
      exec: {
        amount: [{ amount: "50000", denom: "ujuno" }],
        gas: "25000000",
      }
    },
  },
  localnet: {
    endpoint: 'http://localhost:36657/',
    accounts: localnet_accounts,
    fees: {
      upload: {
        amount: [{ amount: "100000", denom: "ujuno" }],
        gas: "50000000",
      },
      init: {
        amount: [{ amount: "50000", denom: "ujuno" }],
        gas: "25000000",
      },
      exec: {
        amount: [{ amount: "50000", denom: "ujuno" }],
        gas: "25000000",
      }
    },
  },
  // uni-3
  testnet: {
    endpoint: 'https://rpc.uni.juno.deuslabs.fi/',//https://lcd.uni.juno.deuslabs.fi/
    chainId: 'uni-3',
    trustNode: true,
    keyringBackend: 'test',
    accounts: testnet_accounts,
  }
};

module.exports = {
  networks: {
    testnet: networks.testnet,
    default: networks.localnet
  },
  mocha: {
    timeout: 6000000
  },
  rust: {
    version: "1.63.0",
  }
};
