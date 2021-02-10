#!/usr/bin/env node

const ccxt = require('ccxt');
const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const args = process.argv.slice(2);
const command = args[0] || 'status';

const market = config.market;
const priced = 1 + config.max_spread;
const demo = config.demo;

(async () => {

let exchange;
if (config.kucoin) {
  exchange = new ccxt.kucoin(config.kucoin);
} else if (config.bitmax) {
  exchange = new ccxt.bitmax(config.bitmax);
}

const db = await sqlite.open({
  filename: './lqbot.db',
  driver: sqlite3.Database
})

const merged = {};

const createMergedOrders = async () => {
  const openOrders = await exchange.fetchOpenOrders(market);
  const dbOrders = await db.all('SELECT * FROM orders WHERE active = 1 ORDER BY price DESC;');

  for (const order of dbOrders) {
    merged[order.id] = order;
  }
  for (const order of openOrders) {
    if (!merged[order.id]) continue;
    merged[order.id].exchange = order;
  }
  for (const orderId of Object.keys(merged)) {
    const order = merged[orderId];
    if (!order.exchange) {
      order.status = 'removed';
      order.lastTradeTimestamp = Date.now();
    } else {
      order.status = order.exchange.status;
      order.lastTradeTimestamp = order.exchange.lastTradeTimestamp;
    }
    order.exchange = undefined;
  }
}

const createOrder = async (direction, amount, price) => {
  if (demo) {
    return {status: 'removed', id: `demo-${Math.random()}`, timestamp: Date.now()}
  }
  try {
    if (direction == 'buy') {
      return await exchange.createLimitBuyOrder(market, amount, price);
    } else {
      return await exchange.createLimitSellOrder(market, amount, price);
    }
  } catch (e) {
    return {status: 'failed', id: 'error', message: e.message, timestamp: Date.now()};
  }
}

const cancelOrder = async (orderId) => {
  if (!demo) {
    try {
      await exchange.cancelOrder(orderId);
    } catch (ignored) {}
  }
  await db.run('UPDATE orders SET active=0, endTime=? WHERE id=?', Date.now(), orderId);
}


switch (command) {
  case 'status':
    await createMergedOrders();
    for (const orderId of Object.keys(merged)) {
      const order = merged[orderId];
      console.log(`${orderId} ${order.direction} ${order.amount} ${order.price} ${order.status}`);
    }
    break;
  case 'cancelall'
  case 'cancel-all':
  case 'cancel_all': {
    await createMergedOrders();
    for (const orderId of Object.keys(merged)) {
      await cancelOrder(orderId);
    }
  }
  case 'add': {
    const direction = args[1];
    const amount = args[2];
    const price = args[3];
    if (direction != 'buy' && direction != 'sell') throw new Error("<direction> must be 'buy' or 'sell'");
    const newOrder = await createOrder(direction, amount, price);
    if (newOrder.status == 'failed') throw new Error(newOrder.message);
    await db.run('INSERT INTO orders(id, price, amount, direction, active, startTime, endTime) VALUES (?,?,?,?,1,?,0)', newOrder.id, price, amount, direction, newOrder.timestamp);
    console.log(`${newOrder.id} ${direction} ${amount} ${price}`);
    break;
  }
  case 'cancel': {
    const orderId = args[1];
    cancelOrder(orderId);
    break;
  }
  case 'run': {
    await createMergedOrders();
    for (const orderId of Object.keys(merged)) {
      const order = merged[orderId];
      if (order.status == 'removed' || order.status == 'closed' || order.status == 'cancelled') {
        await db.run('UPDATE orders SET active=0, endTime=? WHERE id=?', order.lastTradeTimestamp, orderId);
      }
      if (order.status == 'removed' || order.status == 'closed') {
        let newPrice, newDirection;
        if (order.direction == 'buy') {
          newDirection = 'sell';
          newPrice = (parseFloat(order.price) * priced).toFixed(10);
        } else {
          newDirection = 'buy';
          newPrice = (parseFloat(order.price) / priced).toFixed(10);
        }
        const newOrder = await createOrder(newDirection, order.amount, newPrice);
        if (newOrder.status == 'failed') throw new Error(newOrder.message);
        await db.run('INSERT INTO orders(id, price, amount, direction, active, startTime, endTime) VALUES (?,?,?,?,1,?,0)', newOrder.id, newPrice, order.amount, newDirection, newOrder.timestamp);
        console.log(`${newOrder.id} ${newDirection} ${order.amount} ${newPrice}`);
      }
    }
  }
}


})().catch(e => console.error(e));
