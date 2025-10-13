import express from 'express';

// Handlers implemented in project `api/` directory
import tasksHandler from '../api/tasks';
import assignOptionsHandler from '../api/assign-options';
import assigneesHandler from '../api/assignees';
import taskIdHandler from '../api/tasks/[id]';
import healthHandler from '../api/health';

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());

// Health check for local verification
app.get('/healthz', (_req, res) => {
  res.status(200).json({ ok: true });
});

// API routes
app.get('/api/tasks', (req, res) => tasksHandler(req as any, res as any));
app.get('/api/assign-options', (req, res) => assignOptionsHandler(req as any, res as any));
app.get('/api/assignees', (req, res) => assigneesHandler(req as any, res as any));
app.get('/api/health', (req, res) => healthHandler(req as any, res as any));
app.patch('/api/tasks/:id', (req, res) => {
  // Adapt Express params -> handler expects query.id
  const adaptedReq = Object.assign({}, req, {
    query: { ...(req as any).query, id: req.params.id },
  });
  return taskIdHandler(adaptedReq as any, res as any);
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[dev-api] listening on http://localhost:${PORT}`);
});


