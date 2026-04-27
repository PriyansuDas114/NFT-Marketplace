# NFT Marketplace

A full-stack NFT marketplace project with:

- Smart contracts using Hardhat and OpenZeppelin
- Backend API using Express, Prisma, and Socket.IO
- Frontend client using React + Vite

## Project Structure

```
nft-marketplace/
	contracts/          # Solidity contracts (NFT, Marketplace)
	backend/            # Express API, Prisma schema/migrations, sockets
	frontend/           # React app (Vite)
	scripts/            # Hardhat deployment scripts
	test/               # Contract tests
```

## Prerequisites

- Node.js 18+
- npm 9+
- A local or hosted database for Prisma (configure in backend/.env)
- A Web3 wallet and RPC URL for blockchain interaction

## Install Dependencies

Install dependencies in all relevant packages.

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

## Environment Variables

Create environment files as needed:

- `backend/.env`
- `frontend/.env`
- root `.env` (for Hardhat deploy/config)

### Root `.env` (Hardhat)

```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY
```

### `backend/.env`

```env
PORT=5000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
```

### `frontend/.env`

```env
VITE_API_URL=http://localhost:5000
VITE_NFT_ADDRESS=0xYourNFTContractAddress
VITE_MARKETPLACE_ADDRESS=0xYourMarketplaceAddress
VITE_NFT_STORAGE_TOKEN=YOUR_NFT_STORAGE_TOKEN
```

The frontend has fallback local addresses in code, but you should still set explicit values for consistency.

## Smart Contracts (Hardhat)

Compile contracts:

```bash
npx hardhat compile
```

Run tests:

```bash
npx hardhat test
```

Deploy contracts:

```bash
npx hardhat run scripts/deploy.js --network <networkName>
```

For local development, start a local chain in another terminal:

```bash
npx hardhat node
```

Then deploy locally:

```bash
npx hardhat run scripts/deploy.js --network hardhat
```

The deploy script prints both contract addresses. Copy them into `frontend/.env` as:

- `VITE_NFT_ADDRESS`
- `VITE_MARKETPLACE_ADDRESS`

## Backend

From `backend/`:

Run Prisma migrations:

```bash
npx prisma migrate dev
```

Start API server:

```bash
npm start
```

Default entry point is `backend/server.js`.

### API Endpoints

Base URL: `http://localhost:5000`

- `GET /api/nfts` : returns all NFTs (newest first)
- `GET /api/nfts/listed` : returns only listed NFTs
- `POST /api/nfts/mint` : saves minted NFT metadata in DB
- `POST /api/nfts/list` : marks an NFT as listed and updates price
- `GET /api/metrics` : returns dashboard metrics

`POST /api/nfts/mint` example body:

```json
{
	"tokenId": "1",
	"name": "Aurora #1",
	"description": "Genesis art piece",
	"price": 0.15,
	"image": "https://...",
	"ipfsUrl": "ipfs://...",
	"owner": "0xabc...",
	"listed": false
}
```

`POST /api/nfts/list` example body:

```json
{
	"tokenId": "1",
	"price": 0.25
}
```

### Realtime Metrics

Socket.IO is initialized in the backend server. On connect and relevant NFT updates, the server emits `metricsUpdate` events.

Frontend hook reference: `frontend/src/hooks/useSocket.js`

## Frontend

From `frontend/`:

Start development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

The frontend expects backend API and socket endpoints from `VITE_API_URL`.

## Local Development (End-to-End)

Use 4 terminals for smooth local development:

1. Hardhat local chain

```bash
npx hardhat node
```

2. Contract deployment

```bash
npx hardhat run scripts/deploy.js --network hardhat
```

3. Backend API

```bash
cd backend
npx prisma migrate dev
npm start
```

4. Frontend app

```bash
cd frontend
npm run dev
```

## Data Model

Prisma model (`backend/prisma/schema.prisma`) tracks:

- `tokenId` (unique)
- `name`, `description`, `image`, `ipfsUrl`
- `price` (float)
- `owner`
- `listed` (boolean)
- `createdAt`

## Troubleshooting

- `PrismaClientInitializationError`:
	- Confirm `backend/.env` has a valid `DATABASE_URL`.
	- Run `npx prisma migrate dev` from `backend/`.
- Wallet/MetaMask errors in frontend:
	- Ensure wallet is installed and connected to the correct network.
	- Check `VITE_NFT_ADDRESS` and `VITE_MARKETPLACE_ADDRESS`.
- IPFS upload failure:
	- Verify `VITE_NFT_STORAGE_TOKEN` is set and valid.
- CORS or API connection issues:
	- Ensure backend runs on `PORT` matching `VITE_API_URL`.

## Suggested Development Flow

1. Start or connect to a blockchain network.
2. Deploy contracts and copy deployed addresses.
3. Set backend and frontend environment variables.
4. Run backend (`backend/`) and frontend (`frontend/`) in parallel.
5. Mint, list, and explore NFTs through the app UI.

## Notes

- Keep contract ABI files in sync with frontend files under `frontend/src/abis/`.
- Never commit private keys or sensitive `.env` values.
- If deployment addresses change, update frontend env variables before testing marketplace actions.
