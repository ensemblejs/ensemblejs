
##### Document This
- Try the idea of returning a path array and a function. The mutator looks up the original value, passes it to the function and replaces it with what comes back from the function.

```javascript
function increment (current) { return current + 1; }
function decrement (current) { return current - 1; }

[
  'deaths': increment
]
```

