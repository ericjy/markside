# Vega-Lite charts

A line chart with two series:

```vega-lite
{
  "title": "Requests",
  "data": {
    "values": [
      { "day": "Mon", "count": 30, "service": "api" },
      { "day": "Tue", "count": 55, "service": "api" },
      { "day": "Wed", "count": 80, "service": "api" },
      { "day": "Mon", "count": 20, "service": "web" },
      { "day": "Tue", "count": 35, "service": "web" },
      { "day": "Wed", "count": 40, "service": "web" }
    ]
  },
  "mark": { "type": "line", "point": true },
  "encoding": {
    "x": { "field": "day", "type": "nominal" },
    "y": { "field": "count", "type": "quantitative" },
    "color": { "field": "service" }
  }
}
```

A chart that asks for external data shows an error and sends no request:

```vega-lite
{
  "data": { "url": "https://example.com/data.csv" },
  "mark": "line",
  "encoding": { "x": { "field": "day" } }
}
```

Invalid JSON shows an error:

```vega-lite
{ not json
```

A `vega` fence stays a code block:

```vega
{ "marks": [] }
```
