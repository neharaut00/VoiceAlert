const { initializeApp, cert } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')

const serviceAccount = require('../credentials/voice-alert-e9c8f-firebase-adminsdk-lcg8j-bbec846b2c.json')

initializeApp({
    credential: cert(serviceAccount)
})

const db = getFirestore()

module.exports = { db }

