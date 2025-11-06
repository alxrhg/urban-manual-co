#!/usr/bin/env node

/**
 * Simple approval server for Instagram content
 * Run with: node approval-server.js
 * Access at: http://localhost:3001
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.APPROVAL_PORT || 3001;
const QUEUE_FILE = path.join(__dirname, 'approval-queue.jsonl');
const APPROVED_FILE = path.join(__dirname, 'approved-queue.jsonl');
const GENERATED_CONTENT_DIR = path.join(__dirname, '../generated-content');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  // Serve the dashboard
  if (pathname === '/' || pathname === '/dashboard') {
    fs.readFile(path.join(__dirname, 'approval-dashboard.html'), (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading dashboard');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html', ...corsHeaders });
      res.end(data);
    });
    return;
  }

  // API: Get pending posts
  if (pathname === '/api/posts' && req.method === 'GET') {
    fs.readFile(QUEUE_FILE, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ posts: [] }));
        return;
      }

      try {
        const lines = data.split('\n---\n').filter(l => l.trim());
        const posts = lines.map(line => JSON.parse(line));
        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ posts }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: 'Failed to parse posts' }));
      }
    });
    return;
  }

  // API: Approve post
  if (pathname === '/api/approve' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { postId } = JSON.parse(body);
        updatePostStatus(postId, 'approved', (err) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
            res.end(JSON.stringify({ error: 'Failed to approve post' }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ success: true, postId }));
        });
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  // API: Reject post
  if (pathname === '/api/reject' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { postId } = JSON.parse(body);
        updatePostStatus(postId, 'rejected', (err) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
            res.end(JSON.stringify({ error: 'Failed to reject post' }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ success: true, postId }));
        });
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  // API: Bulk approve
  if (pathname === '/api/bulk-approve' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { postIds } = JSON.parse(body);
        bulkUpdateStatus(postIds, 'approved', (err) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
            res.end(JSON.stringify({ error: 'Failed to approve posts' }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ success: true, count: postIds.length }));
        });
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  // Serve generated images
  if (pathname.startsWith('/images/')) {
    const imageName = pathname.replace('/images/', '');
    const imagePath = path.join(GENERATED_CONTENT_DIR, imageName);

    fs.readFile(imagePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Image not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'image/png', ...corsHeaders });
      res.end(data);
    });
    return;
  }

  // 404
  res.writeHead(404, { ...corsHeaders });
  res.end('Not found');
});

// Helper: Update post status
function updatePostStatus(postId, status, callback) {
  fs.readFile(QUEUE_FILE, 'utf8', (err, data) => {
    if (err) return callback(err);

    try {
      const lines = data.split('\n---\n').filter(l => l.trim());
      const posts = lines.map(line => JSON.parse(line));

      const post = posts.find(p => p.id === postId);
      if (!post) return callback(new Error('Post not found'));

      post.status = status;
      post.updatedAt = new Date().toISOString();

      const updatedData = posts.map(p => JSON.stringify(p)).join('\n---\n');
      fs.writeFile(QUEUE_FILE, updatedData, (err) => {
        if (err) return callback(err);

        // If approved, add to approved queue
        if (status === 'approved') {
          addToApprovedQueue(post, callback);
        } else {
          callback(null);
        }
      });
    } catch (error) {
      callback(error);
    }
  });
}

// Helper: Bulk update status
function bulkUpdateStatus(postIds, status, callback) {
  fs.readFile(QUEUE_FILE, 'utf8', (err, data) => {
    if (err) return callback(err);

    try {
      const lines = data.split('\n---\n').filter(l => l.trim());
      const posts = lines.map(line => JSON.parse(line));

      const approvedPosts = [];
      posts.forEach(post => {
        if (postIds.includes(post.id)) {
          post.status = status;
          post.updatedAt = new Date().toISOString();
          if (status === 'approved') {
            approvedPosts.push(post);
          }
        }
      });

      const updatedData = posts.map(p => JSON.stringify(p)).join('\n---\n');
      fs.writeFile(QUEUE_FILE, updatedData, (err) => {
        if (err) return callback(err);

        // Add approved posts to approved queue
        if (approvedPosts.length > 0) {
          const approvedData = approvedPosts.map(p => JSON.stringify(p)).join('\n---\n') + '\n---\n';
          fs.appendFile(APPROVED_FILE, approvedData, callback);
        } else {
          callback(null);
        }
      });
    } catch (error) {
      callback(error);
    }
  });
}

// Helper: Add to approved queue
function addToApprovedQueue(post, callback) {
  const postData = JSON.stringify(post) + '\n---\n';
  fs.appendFile(APPROVED_FILE, postData, callback);
}

// Start server
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║  Instagram Approval Dashboard                      ║
║                                                    ║
║  Server running at: http://localhost:${PORT}       ║
║                                                    ║
║  Open in your browser to approve content          ║
╚═══════════════════════════════════════════════════╝
  `);
});
