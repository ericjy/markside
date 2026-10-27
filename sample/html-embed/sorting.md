# Sorting, visualized

Every sorting algorithm does the same two things: it compares two items, and it
moves items around. What differs is how many times. Below, four classic
algorithms sort the same 60 numbers at the same pace: one comparison or one
write per step.

![Four sorting algorithms race on the same shuffled numbers](./sorting.assets/sorting-race.html)

Change the starting order and the race changes. On **Nearly sorted** input,
insertion sort beats the "fast" algorithms, because it only moves what is out of
place. On **Reversed** input, this quicksort slows to a crawl: it always picks
the last item as its pivot, which is the worst possible choice when the input is
already in order. No algorithm wins on every input.

## Why the gap matters

At 60 items the difference is a few seconds of animation. Real data is bigger.
Drag the slider to see how long each kind of algorithm needs as the input grows.

![How long O(log n), O(n), O(n log n), O(n²), and O(2ⁿ) take as n grows](./sorting.assets/growth.html)

| Algorithm | Best case | Average | Worst case | Extra memory |
|---|---|---|---|---|
| Bubble sort | O(n) | O(n²) | O(n²) | O(1) |
| Insertion sort | O(n) | O(n²) | O(n²) | O(1) |
| Merge sort | O(n log n) | O(n log n) | O(n log n) | O(n) |
| Quicksort | O(n log n) | O(n log n) | O(n²) | O(log n) |

## What your language actually uses

Standard libraries combine these ideas instead of picking one:

- **Timsort**, used by Python's `sorted()`, Java's `Arrays.sort` for objects, and
  V8's `Array.prototype.sort`, is a merge sort that looks for runs that are
  already sorted and uses insertion sort for short stretches.
- **Introsort**, used by most C++ `std::sort` implementations, starts as
  quicksort and switches to heapsort when it detects the worst case.

Insertion sort, the slowpoke above, survives inside both because it is the
fastest choice for a handful of items:

```python
def insertion_sort(items):
    for i in range(1, len(items)):
        j = i
        while j > 0 and items[j - 1] > items[j]:
            items[j - 1], items[j] = items[j], items[j - 1]
            j -= 1
    return items
```
