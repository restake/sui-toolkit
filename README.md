# sui-toolkit

This CLI tool is designed to facilitate several on-chain operations on the Sui network.

## Features

- Simple and straightforward stake rewards withdrawal process.
- Support for HashiCorp Vault and plain-text Base64-encoded keys.

## Installation

### Prebuilt Binaries

We have prebuilt binaries available for common platforms, making it easy to run the CLI tool without any major dependencies. You can find the binaries on the [releases](https://github.com/restake/sui-toolkit/releases) page.

### Building from Source

If you prefer to build or run the project from source, make sure you have [Deno](https://deno.land/) installed.

To simply run the CLI:

```shell
deno run -A ./bin/withdrawer.ts
```

To build a binary:

```shell
deno compile --unstable -A -o sui-toolkit ./bin/withdrawer.ts
```
This will produce a `sui-toolkit` executable binary in the project directory.

Note: compiling binaries with Deno that contain `npm` packages is still quite experimental, hence we use the `--unstable` flag.

## Usage

```
Usage:   sui-toolkit
Version: v0.0.1

Description:

  Easily withdraw Sui validator rewards

Options:

  -h, --help     - Show this help.
  -V, --version  - Show the version number for this program.
  -b, --base64   - Used to indicate whether the keypair is double base64 encoded -  (Default: false)
                   base64(base64Keypair)

Commands:

  withdraw                        - Withdraw all staked Sui objects
  send      <amount> <recipient>  - Send Sui to a given address
```

The default RPC endpoint is `https://rpc.testnet.sui.io`. You can override it with the `SUI_RPC_URL` environment variable.

```shell
export SUI_RPC_URL="https://rpc.testnet.sui.io"
```

## HashiCorp Vault

We use [restake/deno-hashicorp-vault](https://github.com/restake/deno-hashicorp-vault) behind the scenes. It's our own open-source implementation of a Deno SDK for interfacing with HashiCorp Vault API.

To properly communicate with HashiCorp Vault, you need to have the following enviornment variables set:

```shell
export VAULT_ADDR="https://your-vault-address.tld"
export VAULT_TOKEN="foobar"
export VAULT_NAMESPACE="admin/..."
```

## License

This project is licensed under the [MIT License](./LICENSE).
