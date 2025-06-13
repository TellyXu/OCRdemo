const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://209.20.156.150:8000',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/', // 将 '/api' 重写为 '/'
      },
    })
  );
}; 