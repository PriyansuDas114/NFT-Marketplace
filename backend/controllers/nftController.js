import { saveNFT, getAllNFTs, listNFT, getListedNFTs } from '../models/nftModel.js';
import { updateAndBroadcastMetrics } from './metricsController.js';

export const mintNFT = async (req, res) => {
  try {
    const newNFT = await saveNFT(req.body);
    const io = req.app.get('io');
    updateAndBroadcastMetrics(io);
    res.status(201).json(newNFT);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const fetchNFTs = async (req, res) => {
  try {
    const nfts = await getAllNFTs();
    res.json(nfts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const listNFTForSale = async (req, res) => {
  try {
    const { tokenId, price } = req.body;
    const updatedNFT = await listNFT(tokenId, price);
    const io = req.app.get('io');
    updateAndBroadcastMetrics(io);
    res.status(200).json(updatedNFT);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const fetchListedNFTs = async (req, res) => {
  try {
    const listedNFTs = await getListedNFTs();
    res.json(listedNFTs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};