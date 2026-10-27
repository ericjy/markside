# How a language model picks the next word

A language model does not write a sentence. It writes one word at a time,
strictly one *token*, a word or a piece of one, and it repeats the same four
steps every time:

1. Give every possible next token a score.
2. Turn the scores into probabilities.
3. Roll the dice: pick one token at random, weighted by those probabilities.
4. Add it to the text and start again.

Below is that loop with a tiny hand-written model that knows a few dozen words.
A real model scores a vocabulary of 100,000 or more tokens using billions of
parameters, but the picking step works exactly like this.

![A language model generating a sentence one word at a time, with live probabilities and a temperature slider](./next-word.assets/next-word.html)

## Temperature

Before the scores become probabilities, they are divided by the temperature:

```text
probability(word) = e^(score / T) / sum of e^(score / T) over all words
```

A low temperature exaggerates the differences between scores, so the top word
wins almost every time. A high temperature flattens them, so unlikely words get
a real chance.

| Temperature | What happens | Good for |
|---|---|---|
| 0 | Always the highest score | Extraction, code, answers you want repeatable |
| 0.7 to 1.0 | Usually a likely word, sometimes a surprise | Chat and writing |
| Above 1.5 | Long-shot words show up often | Brainstorming, and nonsense |

Drag the slider to 0 and the cat always sits on the mat. Drag it to 2 and the
moon and the banana start to appear.

## Why the same prompt gives different answers

Step 3 is a dice roll. Ask the same question twice and the dice land
differently, and one different word early on sends the rest of the answer down
another path. Setting the temperature to 0 removes the roll, which is why it
makes output close to repeatable.
