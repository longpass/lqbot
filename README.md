# lqbot
Crypto grid trading liquidity bot for beginners.

`lqbot` is a very simple grid trading bot, with the main goal to provide liquidity to a market with little risk.
The bot currently only supports kucoin, but could be easily adapted for other exchanges.

## System

It allows you to place a limit order and whenever that limit order is filled, it will automatically create a counter-order.
A counter order of a buy-order is a sell-order at `price + x%`, a counter-order of a sell-order is a buy-order at `price -x%`.

As long as the price moves up and down, you make profitable trades.
If the price permanently increased, you'll end up with respective tokens sold, if the price permanently decreased you'll end up with respective tokens bought.

## Installation

Make sure you have node.js and yarn installed.
```sh
git clone https://github.com/longpass/lqbot
cd lqbot
yarn
```

## Configuration

Copy `config.json.sample` to `config.json` and edit it.
The configuration file is pretty self-explanatory:

```json
{
  "market": "NIM/BTC",
  "max_spread": 0.01,
  "demo": false,
  "kucoin": {
    "apiKey": "<api-key>",
    "secret": "<api-secret>",
    "password": "<api-password>"
  }
}
```

- `market`: the market you'd like the bot to operate on.
- `max_spread`: This basically defines the `x` as described in [System section](#System). `0.01` equals `x = 1%`
- `demo`: If set to true, no trades will be performed. All demo trades will be considered filled on next iteration.
- `apiKey`, `secret`, `password`: Details for accessing the KuCoin API.

## Usage

### `./index.js status`
Display all orders currently monitored by the bot as well as their current status.

### `./index.js add <buy|sell> <amount> <price>`
Add a new buy or sell order at with given amount at given price. The order will be placed on the exchange and added to the list of bot-monitored trades.

### `./index.js cancel <id>`
Cancel the order with the given id. The order will no longer be monitored by the bot. You can see all possible order ids using `./index.js status`.

### `./index.js run`
Go through all currently monitored orders and check if any of them was filled. Create new orders if necessary.

## Persistance
Once you are happy with the configuration of your bot and have a bunch of orders set up, you'll want to persist it.
For this, configure a cronjob that regularly (suggested is every 5 minutes) runs `./index.js run`.
You can do this easily by invoking:
```sh
./persist.sh
```
