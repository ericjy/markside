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

A bar chart:

```vega-lite
{
  "data": {
    "values": [
      {
        "team": "Search",
        "tickets": 28
      },
      {
        "team": "Billing",
        "tickets": 55
      },
      {
        "team": "Mobile",
        "tickets": 43
      },
      {
        "team": "Infra",
        "tickets": 91
      },
      {
        "team": "Docs",
        "tickets": 17
      }
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {
      "field": "team",
      "type": "nominal",
      "sort": "-y",
      "title": "Team"
    },
    "y": {
      "field": "tickets",
      "type": "quantitative",
      "title": "Open tickets"
    }
  }
}
```

A horizontal bar chart with value labels, layered from two marks:

```vega-lite
{
  "data": {
    "values": [
      {
        "browser": "Chrome",
        "share": 64
      },
      {
        "browser": "Safari",
        "share": 19
      },
      {
        "browser": "Edge",
        "share": 5
      },
      {
        "browser": "Firefox",
        "share": 3
      }
    ]
  },
  "encoding": {
    "y": {
      "field": "browser",
      "type": "nominal",
      "sort": "-x",
      "title": null
    },
    "x": {
      "field": "share",
      "type": "quantitative",
      "title": "Share (%)"
    }
  },
  "layer": [
    {
      "mark": "bar"
    },
    {
      "mark": {
        "type": "text",
        "align": "left",
        "dx": 4
      },
      "encoding": {
        "text": {
          "field": "share"
        }
      }
    }
  ]
}
```

A stacked bar chart:

```vega-lite
{
  "data": {
    "values": [
      {
        "month": "Jan",
        "plan": "Free",
        "users": 120
      },
      {
        "month": "Jan",
        "plan": "Pro",
        "users": 80
      },
      {
        "month": "Jan",
        "plan": "Team",
        "users": 30
      },
      {
        "month": "Feb",
        "plan": "Free",
        "users": 135
      },
      {
        "month": "Feb",
        "plan": "Pro",
        "users": 90
      },
      {
        "month": "Feb",
        "plan": "Team",
        "users": 42
      },
      {
        "month": "Mar",
        "plan": "Free",
        "users": 150
      },
      {
        "month": "Mar",
        "plan": "Pro",
        "users": 85
      },
      {
        "month": "Mar",
        "plan": "Team",
        "users": 55
      },
      {
        "month": "Apr",
        "plan": "Free",
        "users": 170
      },
      {
        "month": "Apr",
        "plan": "Pro",
        "users": 110
      },
      {
        "month": "Apr",
        "plan": "Team",
        "users": 61
      },
      {
        "month": "May",
        "plan": "Free",
        "users": 160
      },
      {
        "month": "May",
        "plan": "Pro",
        "users": 125
      },
      {
        "month": "May",
        "plan": "Team",
        "users": 78
      },
      {
        "month": "Jun",
        "plan": "Free",
        "users": 190
      },
      {
        "month": "Jun",
        "plan": "Pro",
        "users": 140
      },
      {
        "month": "Jun",
        "plan": "Team",
        "users": 92
      }
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {
      "field": "month",
      "type": "ordinal",
      "sort": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun"
      ],
      "title": null
    },
    "y": {
      "field": "users",
      "type": "quantitative",
      "title": "Users"
    },
    "color": {
      "field": "plan",
      "title": "Plan"
    }
  }
}
```

A stacked area chart:

```vega-lite
{
  "data": {
    "values": [
      {
        "month": "Jan",
        "plan": "Free",
        "users": 120
      },
      {
        "month": "Jan",
        "plan": "Pro",
        "users": 80
      },
      {
        "month": "Jan",
        "plan": "Team",
        "users": 30
      },
      {
        "month": "Feb",
        "plan": "Free",
        "users": 135
      },
      {
        "month": "Feb",
        "plan": "Pro",
        "users": 90
      },
      {
        "month": "Feb",
        "plan": "Team",
        "users": 42
      },
      {
        "month": "Mar",
        "plan": "Free",
        "users": 150
      },
      {
        "month": "Mar",
        "plan": "Pro",
        "users": 85
      },
      {
        "month": "Mar",
        "plan": "Team",
        "users": 55
      },
      {
        "month": "Apr",
        "plan": "Free",
        "users": 170
      },
      {
        "month": "Apr",
        "plan": "Pro",
        "users": 110
      },
      {
        "month": "Apr",
        "plan": "Team",
        "users": 61
      },
      {
        "month": "May",
        "plan": "Free",
        "users": 160
      },
      {
        "month": "May",
        "plan": "Pro",
        "users": 125
      },
      {
        "month": "May",
        "plan": "Team",
        "users": 78
      },
      {
        "month": "Jun",
        "plan": "Free",
        "users": 190
      },
      {
        "month": "Jun",
        "plan": "Pro",
        "users": 140
      },
      {
        "month": "Jun",
        "plan": "Team",
        "users": 92
      }
    ]
  },
  "mark": {
    "type": "area",
    "opacity": 0.8
  },
  "encoding": {
    "x": {
      "field": "month",
      "type": "ordinal",
      "sort": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun"
      ],
      "title": null
    },
    "y": {
      "field": "users",
      "type": "quantitative",
      "stack": "zero",
      "title": "Users"
    },
    "color": {
      "field": "plan",
      "title": "Plan"
    }
  }
}
```

A scatter plot with point size and color:

```vega-lite
{
  "data": {
    "values": [
      {
        "latency": 120,
        "errors": 0.4,
        "traffic": 900,
        "region": "us"
      },
      {
        "latency": 180,
        "errors": 0.9,
        "traffic": 650,
        "region": "us"
      },
      {
        "latency": 95,
        "errors": 0.2,
        "traffic": 1200,
        "region": "us"
      },
      {
        "latency": 240,
        "errors": 1.6,
        "traffic": 300,
        "region": "eu"
      },
      {
        "latency": 210,
        "errors": 1.1,
        "traffic": 520,
        "region": "eu"
      },
      {
        "latency": 150,
        "errors": 0.7,
        "traffic": 760,
        "region": "eu"
      },
      {
        "latency": 320,
        "errors": 2.4,
        "traffic": 210,
        "region": "ap"
      },
      {
        "latency": 280,
        "errors": 1.9,
        "traffic": 340,
        "region": "ap"
      }
    ]
  },
  "mark": {
    "type": "point",
    "filled": true
  },
  "encoding": {
    "x": {
      "field": "latency",
      "type": "quantitative",
      "title": "Latency (ms)"
    },
    "y": {
      "field": "errors",
      "type": "quantitative",
      "title": "Error rate (%)"
    },
    "size": {
      "field": "traffic",
      "type": "quantitative",
      "title": "Requests"
    },
    "color": {
      "field": "region",
      "title": "Region"
    }
  }
}
```

A histogram, binned from raw values:

```vega-lite
{
  "data": {
    "values": [
      {
        "ms": 42
      },
      {
        "ms": 55
      },
      {
        "ms": 61
      },
      {
        "ms": 63
      },
      {
        "ms": 70
      },
      {
        "ms": 72
      },
      {
        "ms": 75
      },
      {
        "ms": 78
      },
      {
        "ms": 81
      },
      {
        "ms": 84
      },
      {
        "ms": 88
      },
      {
        "ms": 90
      },
      {
        "ms": 93
      },
      {
        "ms": 95
      },
      {
        "ms": 99
      },
      {
        "ms": 104
      },
      {
        "ms": 108
      },
      {
        "ms": 112
      },
      {
        "ms": 119
      },
      {
        "ms": 125
      },
      {
        "ms": 131
      },
      {
        "ms": 148
      },
      {
        "ms": 160
      },
      {
        "ms": 185
      },
      {
        "ms": 240
      }
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {
      "bin": {
        "maxbins": 10
      },
      "field": "ms",
      "type": "quantitative",
      "title": "Response time (ms)"
    },
    "y": {
      "aggregate": "count",
      "title": "Requests"
    }
  }
}
```

A donut chart:

```vega-lite
{
  "data": {
    "values": [
      {
        "category": "Reading",
        "minutes": 45
      },
      {
        "category": "Editing",
        "minutes": 30
      },
      {
        "category": "Reviewing",
        "minutes": 20
      },
      {
        "category": "Sharing",
        "minutes": 5
      }
    ]
  },
  "width": 300,
  "height": 300,
  "mark": {
    "type": "arc",
    "innerRadius": 70
  },
  "encoding": {
    "theta": {
      "field": "minutes",
      "type": "quantitative"
    },
    "color": {
      "field": "category",
      "title": "Activity"
    }
  }
}
```

A heatmap:

```vega-lite
{
  "data": {
    "values": [
      {
        "day": "Mon",
        "time": "Morning",
        "commits": 3
      },
      {
        "day": "Mon",
        "time": "Noon",
        "commits": 8
      },
      {
        "day": "Mon",
        "time": "Afternoon",
        "commits": 12
      },
      {
        "day": "Mon",
        "time": "Evening",
        "commits": 6
      },
      {
        "day": "Tue",
        "time": "Morning",
        "commits": 5
      },
      {
        "day": "Tue",
        "time": "Noon",
        "commits": 14
      },
      {
        "day": "Tue",
        "time": "Afternoon",
        "commits": 18
      },
      {
        "day": "Tue",
        "time": "Evening",
        "commits": 9
      },
      {
        "day": "Wed",
        "time": "Morning",
        "commits": 4
      },
      {
        "day": "Wed",
        "time": "Noon",
        "commits": 11
      },
      {
        "day": "Wed",
        "time": "Afternoon",
        "commits": 20
      },
      {
        "day": "Wed",
        "time": "Evening",
        "commits": 7
      },
      {
        "day": "Thu",
        "time": "Morning",
        "commits": 6
      },
      {
        "day": "Thu",
        "time": "Noon",
        "commits": 16
      },
      {
        "day": "Thu",
        "time": "Afternoon",
        "commits": 15
      },
      {
        "day": "Thu",
        "time": "Evening",
        "commits": 10
      },
      {
        "day": "Fri",
        "time": "Morning",
        "commits": 2
      },
      {
        "day": "Fri",
        "time": "Noon",
        "commits": 7
      },
      {
        "day": "Fri",
        "time": "Afternoon",
        "commits": 9
      },
      {
        "day": "Fri",
        "time": "Evening",
        "commits": 4
      }
    ]
  },
  "mark": "rect",
  "encoding": {
    "x": {
      "field": "time",
      "type": "ordinal",
      "sort": [
        "Morning",
        "Noon",
        "Afternoon",
        "Evening"
      ],
      "title": null
    },
    "y": {
      "field": "day",
      "type": "ordinal",
      "sort": [
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri"
      ],
      "title": null
    },
    "color": {
      "field": "commits",
      "type": "quantitative",
      "title": "Commits"
    }
  }
}
```

A line with a calculated field and a target rule, layered:

```vega-lite
{
  "data": {
    "values": [
      {
        "week": 1,
        "done": 12,
        "total": 60
      },
      {
        "week": 2,
        "done": 21,
        "total": 60
      },
      {
        "week": 3,
        "done": 33,
        "total": 60
      },
      {
        "week": 4,
        "done": 38,
        "total": 60
      },
      {
        "week": 5,
        "done": 49,
        "total": 60
      },
      {
        "week": 6,
        "done": 57,
        "total": 60
      }
    ]
  },
  "transform": [
    {
      "calculate": "datum.done / datum.total * 100",
      "as": "percent"
    }
  ],
  "layer": [
    {
      "mark": {
        "type": "line",
        "point": true
      },
      "encoding": {
        "x": {
          "field": "week",
          "type": "quantitative",
          "title": "Week",
          "axis": {
            "tickMinStep": 1
          }
        },
        "y": {
          "field": "percent",
          "type": "quantitative",
          "title": "Complete (%)",
          "scale": {
            "domain": [
              0,
              100
            ]
          }
        }
      }
    },
    {
      "mark": {
        "type": "rule",
        "strokeDash": [
          4,
          4
        ]
      },
      "encoding": {
        "y": {
          "datum": 80
        }
      }
    }
  ]
}
```

Small multiples, one chart per plan:

```vega-lite
{
  "data": {
    "values": [
      {
        "month": "Jan",
        "plan": "Free",
        "users": 120
      },
      {
        "month": "Jan",
        "plan": "Pro",
        "users": 80
      },
      {
        "month": "Jan",
        "plan": "Team",
        "users": 30
      },
      {
        "month": "Feb",
        "plan": "Free",
        "users": 135
      },
      {
        "month": "Feb",
        "plan": "Pro",
        "users": 90
      },
      {
        "month": "Feb",
        "plan": "Team",
        "users": 42
      },
      {
        "month": "Mar",
        "plan": "Free",
        "users": 150
      },
      {
        "month": "Mar",
        "plan": "Pro",
        "users": 85
      },
      {
        "month": "Mar",
        "plan": "Team",
        "users": 55
      },
      {
        "month": "Apr",
        "plan": "Free",
        "users": 170
      },
      {
        "month": "Apr",
        "plan": "Pro",
        "users": 110
      },
      {
        "month": "Apr",
        "plan": "Team",
        "users": 61
      },
      {
        "month": "May",
        "plan": "Free",
        "users": 160
      },
      {
        "month": "May",
        "plan": "Pro",
        "users": 125
      },
      {
        "month": "May",
        "plan": "Team",
        "users": 78
      },
      {
        "month": "Jun",
        "plan": "Free",
        "users": 190
      },
      {
        "month": "Jun",
        "plan": "Pro",
        "users": 140
      },
      {
        "month": "Jun",
        "plan": "Team",
        "users": 92
      }
    ]
  },
  "width": 160,
  "height": 140,
  "mark": "line",
  "encoding": {
    "facet": {
      "field": "plan",
      "title": null,
      "columns": 3
    },
    "x": {
      "field": "month",
      "type": "ordinal",
      "sort": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun"
      ],
      "title": null
    },
    "y": {
      "field": "users",
      "type": "quantitative",
      "title": "Users"
    }
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
