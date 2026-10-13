# Browser Network Analysis

## How it was checked

The SecureCloud login page was opened in Chromium at `http://127.0.0.1:5174/login`. Browser caching was disabled before reloading the page. To repeat this check manually, open the page, press **F12**, select **Network**, tick **Disable cache**, and reload.

## Results

- Requests: **17** (including the page itself)
- Transferred page data: **10,045,706 bytes** (about **9.58 MiB**)
- Slowest resource: `/node_modules/.vite/deps/react-dom_client.js` — **185 ms**
- HTTP status codes: **17 × 200**
- 3xx responses: **None**
- 4xx responses: **None**

This measurement is from the local Vite development server. Development tools and unminified dependencies are included in the transferred size, so it is not a production-page size.
