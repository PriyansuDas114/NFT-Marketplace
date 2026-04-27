import { getMetrics } from '../models/metricModel.js';

export const fetchMetrics = async (req, res) => {
  try {
    const metrics = await getMetrics(); 
    res.status(200).json(metrics);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

export const updateAndBroadcastMetrics = async(io) =>{
  try{
    const data = await getMetrics();
    io.emit('metricsUpdate',data);
  }
  catch(err){
    console.error('WebSocket metric broadcast error:', err.message);
  }
}
