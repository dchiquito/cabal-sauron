#!/usr/bin/env node

const Client = require('cabal-client')
const minimist = require('minimist')
const os = require('os')

var args = minimist(process.argv.slice(2))

var usage = `Usage

  cabal-sauron --key cabal://key --owner a60bad97db13f99bc51448908a6a71de4a68aa2ede8a9db3edc6dfe4290ac9d5

  Options:
    --key
    --owner
    --nick
    --message
`

const key = (args.key || '').replace('cabal://', '').replace('cbl://', '').replace('dat://', '').replace(/\//g, '')
const owner = args.owner
const nick = args.nick || 'sauron'
var botMessage = args.message

if (!key || !owner) {
  console.log(usage)
  process.exit(1)
}

async function main() {
  var cabalClient = new Client({
    config: {
      temp: false,
      dbdir: `${os.homedir()}/.cabal-sauron/v${Client.getDatabaseVersion()}`,
    }
  })
  const cabalDetails = await cabalClient.addCabal(key);
  await cabalDetails.publishNick(nick, async () => {
    
    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
    // TODO how to better wait for the owner to load?
    console.log('Loading cabal...')
    await sleep(2000)
    console.log(`Assumed identity ${cabalDetails.getLocalUser().key}`)

    const ownerUser = cabalDetails.getUsers()[owner]
    if (!ownerUser) {
      console.log(`Could not find user ${owner}`)
      process.exit(1)
    }
    const ownerNick = ownerUser.name
    botMessage = botMessage || `🤖 I am a robot 🤖\nI idly watch the cabal to ensure that there's always at least one peer available to hold your messages for you.\nSee https://github.com/dchiquito/cabal-sauron for my source code.\nI am operated by ${ownerNick} (${owner}), please contact them with any questions or concerns.`

    function sendPrivateMessage (message, id) {
      cabalDetails.publishMessage({
        type: 'chat/text',
        content: {
          channel: id,
          text: message
        }
      })
    }

    function keyToNick (key) {
      var user = cabalDetails.getUsers()[key]
      if (user && user.name) {
        return user.name
      } else {
        return key.substr(0, 5)
      }
    }

    cabalDetails.core.privateMessages.events.on('message', (pubkey, message) => {
      if (message && message.value && message.value.content) {
        // message.key is who the message was sent to
        // We only want to respond to incoming messages
        if (message.key === cabalDetails.getLocalUser().key) {
          return
        }
        var text = message.value.content.text
        // Give an automated bot message to the interested stranger
        sendPrivateMessage(botMessage, pubkey)
        // Notify the owner
        sendPrivateMessage(`<${keyToNick(pubkey)}>: ${text}`)
      }
    })

    console.log('Watching commences')
    sendPrivateMessage('Watching commences', owner)
  })
}

main()