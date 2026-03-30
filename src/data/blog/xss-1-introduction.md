---
title: "XSS Demystified: Understanding Cross-Site Scripting from the Ground Up"
description: "The first in an article series on Cross-Site Scripting. A beginner-friendly introduction to XSS. What it is, why it exists, and why it matters. Part 1/4."
pubDatetime: 2026-03-29T00:00:00Z
tags: ["web", "xss", "series-xss", "beginner"]
featured: false
draft: false
---

## Table of Contents

## Introduction

If you have spent any time learning about web security, you have probably kept seeing the same three letters again and again: XSS[^1].

In 2025 alone, XSS accounts for more than 8,000 new CVEs[^2], bringing the total number to a staggering 30,000, making it the highest-frequency web vulnerability on record. It is not the most destructive vulnerability out there, but it is one of the easiest to find, and one of the most consistently present across all types of web applications.

XSS does not require access to the server, no special privileges, and often no advanced tooling. All it takes is an input field that trusts user data a little too much. A vulnerability that is easy to exploit and found almost everywhere is definitely a vulnerability that we should look for, both in attack and defense of a web application.

In the OWASP[^3] Top 10 2025, XSS no longer has its own category. It was merged into A05: Injection, which ranks fifth on the list. XSS has always been an injection vulnerability at its core: untrusted input being sent to a browser and interpreted as code.

This article is the first in a four-part series dedicated to Cross-Site Scripting. The goal here is simple: build a solid understanding of what XSS is, where it comes from, and why it matters, before diving into the technical details of each type in the following parts.

No prior experience required. Let's start from zero.

---

## What is XSS?

**Cross-Site Scripting (XSS)** is a web vulnerability that allows an attacker to inject malicious code into a web page, which then gets executed by a browser.

The key word is inject. The attacker does not need to break into the server or steal credentials. They simply find a place where the application handles user input without properly checking it, and they abuse it to insert their own code.

That code then runs in a browser, in the context of the vulnerable website, as if it was legitimate.

```
Normal input:
┌─────────────┐     "Hello"      ┌─────────────┐     "Hello"      ┌─────────────┐
│    User     │ ───────────────► │  Web Page   │ ───────────────► │   Browser   │
└─────────────┘                  └─────────────┘                  └─────────────┘
                                                                   renders text

XSS input:
┌─────────────┐  <script>        ┌─────────────┐  <script>        ┌─────────────┐
│  Attacker   │  alert(1)    ──► │  Web Page   │  alert(1)    ──► │   Browser   │
└─────────────┘  </script>       └─────────────┘  </script>       └─────────────┘
      ▲                                                                  │
      └──────────────────────── alert(1) popup ──────────────────────────┘
```
The ```<script>alert(1)</script>``` payload is the simplest XSS proof of concept. It does not steal anything or cause any real damage. It just pops up an alert box in the browser. If that box appears, it means the browser executed the injected code, which confirms the vulnerability exists.

This is the core of XSS: **the browser becomes the execution environment for the attacker's code**.

---

## Why Does XSS Exist?

XSS exists because of one fundamental problem: **user input being trusted and displayed without proper validation or sanitization**.

Web applications are built to be dynamic. They take input from users and display it back. A forum shows your comment. A search engine reflects your query. An error message repeats what you typed.

When a developer forgets or does not know how to properly handle that input, the door opens for injection.

```
What should happen:
User types: <script>alert(1)</script>
App stores: &lt;script&gt;alert(1)&lt;/script&gt;
Browser shows: <script>alert(1)</script>  ← displayed as text, harmless

What happens in a vulnerable app:
User types: <script>alert(1)</script>
App stores: <script>alert(1)</script>
Browser reads: <script>alert(1)</script>  ← executed as code, dangerous
```

The fix is called **output encoding** or **input sanitization** converting special characters like `<` and `>` into their harmless HTML equivalents. When this step is missing, XSS is possible.

---

## How Does it Work?

Let's walk through the simplest possible XSS scenario.

Imagine a website with a search bar. You type something, hit enter, and the page displays your query back to you: "You searched for: hello".

Pretty standard. Now imagine someone searches for this instead:
```html
<script>alert("XSS")</script>
```

The application does the same thing it always does; it takes the input and puts it into the page. But this time, the page now contains:
```html
You searched for: <script>alert("XSS")</script>
```

The browser does not see text. It sees code. And it runs it.
```
┌─────────────┐  <script>       ┌─────────────┐  <script>       ┌─────────────┐
│  Attacker   │  alert("XSS")   │             │  alert("XSS")   │             │
│             │  </script>      │  Web Page   │  </script>      │   Browser   │
│             │ ──────────────► │             │ ──────────────► │             │
└─────────────┘                 └─────────────┘                 └─────────────┘
      ▲                                                                │
      └─────────────────────── alert("XSS") popup ────────────────────┘
```

The application trusted the input. The browser trusted the page. Neither of them questioned it.

That is the root of every XSS vulnerability.

---

## Why Does it Matter?

XSS is often misunderstood as a minor annoyance; just a pop-up right? But the `alert()` is only used to *prove* the vulnerability exists. What an attacker can actually do is far more serious.

| Attack | Description |
|--------|-------------|
| **Session hijacking** | Steal the victim's session cookie and take over their account |
| **Credential theft** | Inject a fake login form to capture username and password |
| **Keylogging** | Record every keystroke made on the page |
| **Redirection** | Silently redirect the user to a phishing site |
| **Defacement** | Modify the visual content of the page |
| **Cryptomining** | Use the victim's CPU to mine cryptocurrency |
| **Browser exploitation** | In advanced cases, exploit browser vulnerabilities to gain system access |

XSS attacks are limited to what JavaScript can do inside the browser. They cannot directly access the file system or execute system commands. But inside that scope, the possibilities are significant.

### The Risk in Numbers

| Factor | Value |
|--------|-------|
| **Impact** | Medium (client-side only, no direct server compromise) |
| **Probability** | High (one of the most common web vulnerabilities) |
| **Overall Risk** | Medium to High |

> Low impact + High probability = A vulnerability you cannot ignore.

---

## Real-World Examples

XSS is not theoretical. It has caused real damage to real platforms.

### The Samy Worm (2005)

In 2005, a researcher named Samy Kamkar discovered a Stored XSS vulnerability on **MySpace**. He crafted a payload that, when viewed, would automatically add him as a friend and copy the worm to the victim's profile, infecting anyone who visited it next.

Within **24 hours**, over **one million MySpace users** had been infected. The payload itself was relatively harmless, it just posted "Samy is my hero", but the same technique could have been used to steal credentials or spread malware at scale.

### TweetDeck (2014)

A security researcher accidentally discovered an XSS vulnerability in Twitter's **TweetDeck** dashboard. A crafted tweet containing a JavaScript payload would automatically retweet itself when viewed.

The tweet spread to over **38,000 retweets in under two minutes**. Twitter had to temporarily shut down TweetDeck to contain it.

### Google Search (2019)

Even Google's search engine has been affected. In 2019, an XSS vulnerability was found in an XML library used by Google, allowing script injection through the search bar.

If it can happen to Google, it can happen anywhere.

---

## The Three Types of XSS

XSS is not one single technique. There are three distinct types, each working differently and requiring a different approach to exploit and defend against.

| Type | Also Known As | Where it lives | Persistent? |
|------|--------------|----------------|-------------|
| **Stored XSS** | Persistent XSS | Back-end database | Yes |
| **Reflected XSS** | Non-Persistent XSS | Server response | No |
| **DOM-based XSS** | Client-side XSS | Browser DOM | No |

```
Stored XSS:
Attacker ──► [Database] ──► Victim (every time they visit)

Reflected XSS:
Attacker crafts URL ──► Victim clicks ──► Server reflects payload ──► Executes once

DOM-based XSS:
Attacker crafts URL ──► Victim clicks ──► Browser processes payload ──► Never hits server
```

Each type will be covered in detail in the following parts of this series.

---

## What's Next?

Now that you understand the foundation of what XSS is, why it exists, and what it can do, it is time to go deeper.

In the next three parts, we will break down each type of XSS individually:

- **Part 2/4** — Reflected XSS: how it works, how to find it, and how to exploit it
- **Part 3/4** — Stored XSS: the most dangerous type, and why persistence matters
- **Part 4/4** — DOM-based XSS: the most technical type, living entirely in the browser

See you in Part 2.

## Glossary

[^1]: **XSS** = **Cross-Site Scripting**
[^2]: **CVE** = **Common Vulnerabilities and Exposures** is a public database that assigns a unique identifier to each known security vulnerability. It is maintained by MITRE and used as a universal reference across the security industry.
[^3]: **OWASP** = **Open Web Application Security Project** is an international non-profit organization dedicated to improving web application security. All their resources are freely available at [owasp.org](https://owasp.org).