require('./database/settings')
const fs = require('fs')
const pino = require('pino')
const path = require('path')
const axios = require('axios')
const chalk = require('chalk')
const readline = require('readline')
const FileType = require('file-type')
const { exec } = require('child_process')
const { Boom } = require('@hapi/boom') 

const { default: WAConnection, generateWAMessageFromContent, 
prepareWAMessageMedia, useMultiFileAuthState, Browsers, DisconnectReason, makeInMemoryStore, makeCacheableSignalKeyStore, fetchLatestWaWebVersion, proto, PHONENUMBER_MCC, getAggregateVotesInPollMessage } = require('@whiskeysockets/baileys') 

const pairingCode = true
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, resolve)) 

const { MessagesUpsert, Solving } = require('./database/messages') 

async function DzinStart() { 
  const store = await makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) }) 
  const { state, saveCreds } = await useMultiFileAuthState('session') 
  
  const dzin = await WAConnection({ 
    require("http").createServer((_, res) => res.end("Uptime!")).listen(8080)
    version: [2, 3000, 1017531287], 
    browser: ['ios', 'Chrome', '10.15.7'], 
    printQRInTerminal: !pairingCode, 
    logger: pino({ level: "silent" }), 
    auth: state, 
    generateHighQualityLinkPreview: false, 
    getMessage: async (key) => {
      if (store) {
        const msg = await store.loadMessage(key.remoteJid, key.id, undefined) 
        return msg?.message || undefined
      } 
      return {
        conversation: 'Whatsapp Bot By Dzin'
      }
    }
  }) 
  
  if (pairingCode && !dzin.authState.creds.registered) {
    let phoneNumber 
    phoneNumber = await question(chalk.blue.bold('Masukan Nomor WhatsApp Anda :\n')) 
    phoneNumber = phoneNumber.replace(/[^0-9]/g, '') 
    let code = await dzin.requestPairingCode(phoneNumber, "DZINELIT") 
    code = code.match(/.{1,4}/g).join(" - ") || code 
    await console.log(`${chalk.blue.bold('Kode Pairing')} : ${chalk.white.bold(code)}`)
  } 
  
  dzin.ev.on('creds.update', await saveCreds) 
  
  dzin.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update 
    if (connection === 'close') {
      DzinStart()
    } else if (connection === 'open') {
      console.log(`Berhasil terhubung`)
    }
  })
  
  await store.bind(dzin.ev) 
  await Solving(dzin, store) 
  
  dzin.ev.on('messages.upsert', async (message) => {
    await MessagesUpsert(dzin, message, store) 
  }) 
  
  dzin.ev.on('contacts.update', (update) => {
    for (let contact of update) {
      let id = 
      dzin.decodeJid(contact.id) 
      if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
    }
  })
  
  return dzin
} 

DzinStart()
