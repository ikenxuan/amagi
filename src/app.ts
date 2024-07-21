import { StartClient, CreateNewClient } from '.'

(() => { return StartClient(CreateNewClient({ log: true }), { port: 4567 }) })()