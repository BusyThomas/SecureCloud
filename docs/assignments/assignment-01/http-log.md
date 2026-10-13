# HTTP Request and Response Log

**Date checked:** 13 October 2026
**API:** JSONPlaceholder (`https://jsonplaceholder.typicode.com`)
**Command format:** `curl.exe -i --http1.1 -H "Accept: application/json" <URL>`
`Host` and `User-Agent` are added by curl. The request blocks below show the request line and headers; response status, headers, and body are copied from the `-i` output.

## 1. Read post 1

`200 OK` means the request succeeded. `Content-Type: application/json; charset=utf-8` means the response body is JSON encoded as UTF-8.

**Request**

```http
GET /posts/1 HTTP/1.1
Host: jsonplaceholder.typicode.com
User-Agent: curl/8.21.0
Accept: application/json
```

**Response**

```http
HTTP/1.1 200 OK
Date: Tue, 13 Oct 2026 16:24:51 GMT
Content-Type: application/json; charset=utf-8
Content-Length: 292
Connection: keep-alive
access-control-allow-credentials: true
Cache-Control: max-age=43200
etag: W/"124-yiKdLzqO5gfBrJFrcdJ8Yq0LGnU"
expires: -1
pragma: no-cache
vary: Origin, Accept-Encoding
x-content-type-options: nosniff
x-powered-by: Express
x-ratelimit-limit: 3600000
x-ratelimit-remaining: 3599999
x-ratelimit-reset: 1790812826
Age: 23344
Accept-Ranges: bytes
cf-cache-status: HIT
Report-To: {"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=945xluf5BwNZLNd5T2By0TviWruuExWYn2qkIsEIx2I8aS5rhcBYti7%2F3I3%2BVnCVzERfazoQK%2BrBZdml56kcp2a%2BLOvrAcd4CUscUrD3LdUaWB1HgdZzinLoDm8mp6SO%2Bm8RmZfQSQpTUOjvermtW1Sgg6Ycn1lPcwCu"}]}
Nel: {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
Server: cloudflare
CF-RAY: a49fb26c2831d127-CDG
alt-svc: h3=":443"; ma=86400

{
  "userId": 1,
  "id": 1,
  "title": "sunt aut facere repellat provident occaecati excepturi optio reprehenderit",
  "body": "quia et suscipit\nsuscipit recusandae consequuntur expedita et cum\nreprehenderit molestiae ut ut quas totam\nnostrum rerum est autem sunt rem eveniet architecto"
}
```

## 2. Read post 2

`200 OK` means the request succeeded. `Content-Type: application/json; charset=utf-8` means the response body is JSON encoded as UTF-8.

**Request**

```http
GET /posts/2 HTTP/1.1
Host: jsonplaceholder.typicode.com
User-Agent: curl/8.21.0
Accept: application/json
```

**Response**

```http
HTTP/1.1 200 OK
Date: Tue, 13 Oct 2026 16:24:52 GMT
Content-Type: application/json; charset=utf-8
Content-Length: 278
Connection: keep-alive
access-control-allow-credentials: true
Cache-Control: max-age=43200
etag: W/"116-jnDuMpjju89+9j7e0BqkdFsVRjs"
expires: -1
pragma: no-cache
vary: Origin, Accept-Encoding
x-content-type-options: nosniff
x-powered-by: Express
x-ratelimit-limit: 3600000
x-ratelimit-remaining: 3599999
x-ratelimit-reset: 1790812826
Age: 4762
Accept-Ranges: bytes
cf-cache-status: HIT
Report-To: {"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=RHz7VK0lSAZt98SOTyRrAKNEz8LumBuGPh9bIoRKpU49qxjhY9LSq6OyP09pGXEyAT2y8zL%2FEN0SiZcfsi0Fi4LjU3gU42uh5HfuG%2F5Jvln9pHwkv9%2B266trAjxSafpRN8bUtZB9LxQZu5OihNFGwhXlzw5VfmZiPrdG"}]}
Nel: {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
Server: cloudflare
CF-RAY: a49fb26fc89d185c-MRS
alt-svc: h3=":443"; ma=86400

{
  "userId": 1,
  "id": 2,
  "title": "qui est esse",
  "body": "est rerum tempore vitae\nsequi sint nihil reprehenderit dolor beatae ea dolores neque\nfugiat blanditiis voluptate porro vel nihil molestiae ut reiciendis\nqui aperiam non debitis possimus qui neque nisi nulla"
}
```

## 3. Read album 1

`200 OK` means the request succeeded. `Content-Type: application/json; charset=utf-8` means the response body is JSON encoded as UTF-8.

**Request**

```http
GET /albums/1 HTTP/1.1
Host: jsonplaceholder.typicode.com
User-Agent: curl/8.21.0
Accept: application/json
```

**Response**

```http
HTTP/1.1 200 OK
Date: Tue, 13 Oct 2026 16:24:52 GMT
Content-Type: application/json; charset=utf-8
Content-Length: 64
Connection: keep-alive
access-control-allow-credentials: true
cache-control: max-age=43200
etag: W/"40-74G1+b66MteeTYAz6G+NybtDGFA"
expires: -1
pragma: no-cache
vary: Origin, Accept-Encoding
x-content-type-options: nosniff
x-powered-by: Express
x-ratelimit-limit: 3600000
x-ratelimit-remaining: 3599999
x-ratelimit-reset: 1790812826
Age: 2
Accept-Ranges: bytes
cf-cache-status: HIT
Nel: {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
Report-To: {"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=Y0puDGSzRTsBtYWY9c2KHGJHRLinvl5AfEfD9mhLyXD7m7g6xN%2FWwoey8lZHSvlZl0HuvV3oPjdURaT3laU92u1SYzpZcm6F4vaeQm6a7%2Bw07VXA5UfLzwIC8nxZVVfxBTK8i0z9ten0C0tGCtIBnrSY0AyIcLmoHbFs"}]}
Server: cloudflare
CF-RAY: a49fb272cad8e28d-MRS
alt-svc: h3=":443"; ma=86400

{
  "userId": 1,
  "id": 1,
  "title": "quidem molestiae enim"
}
```

## 4. Read todo 2

`200 OK` means the request succeeded. `Content-Type: application/json; charset=utf-8` means the response body is JSON encoded as UTF-8.

**Request**

```http
GET /todos/2 HTTP/1.1
Host: jsonplaceholder.typicode.com
User-Agent: curl/8.21.0
Accept: application/json
```

**Response**

```http
HTTP/1.1 200 OK
Date: Tue, 13 Oct 2026 16:24:53 GMT
Content-Type: application/json; charset=utf-8
Content-Length: 99
Connection: keep-alive
access-control-allow-credentials: true
Cache-Control: max-age=43200
etag: W/"63-+s0zIP5ZEQN9hypVJUneLybJ+L0"
expires: -1
pragma: no-cache
vary: Origin, Accept-Encoding
x-content-type-options: nosniff
x-powered-by: Express
x-ratelimit-limit: 3600000
x-ratelimit-remaining: 3599999
x-ratelimit-reset: 1790827226
Accept-Ranges: bytes
Nel: {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
Age: 11074
cf-cache-status: HIT
Report-To: {"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=3w2%2FWqGReb%2FiFgPrB3pd1LEVx8Tv5%2BY90sQPZfquTwNj1UDUBNY%2FaEAsdCcU3CJS5WGSTuhMu%2F%2BSaj3j0Z16GbefXQ1TtfsdJyzeEjh0cXoUTKvsC5VzzNVaXR9aRKlIPLf3vz1vYX1v7KK%2FSRukSDaXPgL1Y6GpE4Gs"}]}
Server: cloudflare
CF-RAY: a49fb2759c95e18b-MRS
alt-svc: h3=":443"; ma=86400

{
  "userId": 1,
  "id": 2,
  "title": "quis ut nam facilis et officia qui",
  "completed": false
}
```

## 5. Request a post that does not exist

`404 Not Found` means the requested post does not exist. `Content-Type: application/json; charset=utf-8` means the response body is JSON encoded as UTF-8.

**Request**

```http
GET /posts/999999 HTTP/1.1
Host: jsonplaceholder.typicode.com
User-Agent: curl/8.21.0
Accept: application/json
```

**Response**

```http
HTTP/1.1 404 Not Found
Date: Tue, 13 Oct 2026 16:24:54 GMT
Content-Type: application/json; charset=utf-8
Content-Length: 2
Connection: keep-alive
access-control-allow-credentials: true
Cache-Control: max-age=43200
etag: W/"2-vyGp6PvFo4RvsFtPoIWeCReyIC8"
expires: -1
pragma: no-cache
vary: Origin, Accept-Encoding
x-content-type-options: nosniff
x-powered-by: Express
x-ratelimit-limit: 3600000
x-ratelimit-remaining: 3599999
x-ratelimit-reset: 1791910195
Nel: {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
cf-cache-status: HIT
Report-To: {"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=FcE3raVLQY1RtOSg%2FZODZn0s69UFfLWSXZDOVloBhXiph6VRGoAFuyE7%2FaIgRpj%2BJEbutMp6EljBhWmTccBcbJfJNzWvwqe1qFipMAEcGQOJ9NGiKgxxGRqi2fBKgrlh%2B6c6NiWL0627tHQF5U830DbFOWNIoSKpmn4K"}]}
Server: cloudflare
CF-RAY: a49fb2795f704742-CDG
alt-svc: h3=":443"; ma=86400

{}
```
