---
name: DiscoveryCall
description: This skill should be used when conducting discovery calls with consulting leads. It systematically gathers context, identifies problems, positions solutions, and identifies upsell opportunities based on the Nick Saraev approach.
---

# Discovery Call Framework

A systematic approach to consulting discovery calls that maximizes qualification, problem identification, solution positioning, and upsell opportunities.

## When to Use This Skill

Trigger this skill when:
- "discovery call"
- "qualifying a lead"
- "consulting intake call"
- "initial client consultation"
- "prospect call"

## Core Philosophy

Based on Nick Saraev's approach: **"Bring one problem, get one solution."**

Every discovery call should:
1. Gather qualifying context upfront
2. Extract the core problem systematically
3. Position your solution as the bridge from current to ideal state
4. Identify natural upsell opportunities
5. Create clear next steps

## Call Structure

### Phase 1: Upfront Context Gathering (5 minutes)

**CRITICAL: Always start here. Never proceed without this context.**

Use AskUserQuestion tool to gather:

**Question 1: Lead Information**
- Header: "Lead Details"
- Options:
  - "Provide name, company, industry, role"
  - "Provide LinkedIn profile or website"
  - "I'll share the context in text"

**Question 2: Call Source**
- Header: "How'd they find you?"
- Options:
  - "Inbound (they reached out)"
  - "Referral (from existing contact)"
  - "Outbound (I reached out to them)"
  - "Event/Conference meeting"

**Question 3: Pre-Call Research**
- Header: "Research Status"
- Options:
  - "No research done yet - do it now"
  - "I have context - let me share"

**If "No research done yet" selected:**

Use Research skill or direct web search to gather:
- Company size, revenue (if public)
- Recent news/press releases
- Tech stack (if relevant)
- LinkedIn profiles of key stakeholders
- Current pain points mentioned publicly

**Document all context in this format:**

```markdown
## Lead Context

**Name:** [Full name]
**Company:** [Company name]
**Role:** [Their title]
**Industry:** [Industry/vertical]
**Company Size:** [Employees/revenue if known]
**Source:** [How they found you]

**Current Situation:**
- [Key facts from research]
- [Recent company changes/news]
- [Tech stack/current approach if relevant]

**Initial Hypothesis:**
[Your hypothesis about their core problem based on context]
```

### Phase 2: Problem Extraction (10-15 minutes)

Now that you have context, structure the call:

#### 2.1 Opening Frame

**Start with:** "I've done some research on [company]. I see you're [observation from research]. What prompted you to reach out?"

**Goal:** Let them talk. Your job is to listen and extract:
1. **Surface problem** (what they say)
2. **Root problem** (what they mean)
3. **Impact** (cost of inaction)
4. **Timeline** (urgency)

#### 2.2 Systematic Extraction Questions

Use these in order:

**Q1: The Current State**
"Walk me through how you're handling [problem area] today."
- Listen for: inefficiencies, manual processes, bottlenecks, team frustration

**Q2: The Failure Point**
"What specifically isn't working about that approach?"
- Listen for: concrete failures, missed opportunities, competitive pressure

**Q3: The Cost**
"What's this costing you? Not just money - time, opportunity, team morale?"
- Listen for: quantifiable impacts, opportunity costs, strategic risks

**Q4: The Attempts**
"What have you tried so far to fix this?"
- Listen for: budget availability (if they tried expensive solutions), technical sophistication, decision-making speed

**Q5: The Ideal**
"If I could wave a magic wand and fix this perfectly, what would that look like?"
- Listen for: their actual ideal state criteria (ISC)

#### 2.3 Document the Problem

After extraction, summarize back:

```markdown
## Problem Summary

**Surface Problem:** [What they said]
**Root Problem:** [What you diagnosed]
**Current Cost:** [Impact of inaction]
**Ideal State:** [Their vision of success]

**Failed Attempts:**
- [What they've tried]
- [Why it didn't work]

**Timeline:** [Their urgency level]
**Budget Signal:** [Indicators of budget availability]
```

### Phase 3: Solution Positioning (5-10 minutes)

**Framework: Current State → Your Solution → Ideal State**

#### 3.1 Bridge the Gap

"Here's what I'm hearing: You're at [current state], you want to get to [ideal state], and the gap is [root problem]. Here's how I'd approach this..."

#### 3.2 Provide Strategic Direction

**Give them ONE clear strategic insight.**

This is NOT a full solution. This is a taste:
- "The reason [previous approach] failed is because [insight]"
- "Most companies in [industry] miss this: [unique perspective]"
- "The leverage point here isn't [obvious thing], it's [non-obvious thing]"

**Example from Nick's transcript:**
- Lead: "Should I do marketing agency or AI automation agency?"
- Nick's insight: "Marketing agencies peaked in 2017-2018, trending down. AI automation is on the way up, won't peak until ~2028. You're choosing between jumping on something declining vs. something ascending."

#### 3.3 Position Your Offering

"The full solution would involve [components], which we could do through [your service offering]."

**Key components to mention:**
- Scope (what's included)
- Timeline (how long)
- Investment range (ballpark)
- Success criteria (how we measure)

### Phase 4: Upsell Identification (5 minutes)

#### 4.1 Map Their Journey

Based on the call, identify where they fit:

**Tier 1: Quick Win ($X-$Y)**
- Clear, scoped problem
- Fast implementation
- Immediate ROI
- Example: "AI automation for one specific workflow"

**Tier 2: Strategic Implementation ($Y-$Z)**
- Multiple connected problems
- 3-6 month timeline
- Transformative impact
- Example: "Full AI automation roadmap + implementation"

**Tier 3: Ongoing Partnership ($Z+/month)**
- Complex, evolving challenges
- Continuous optimization
- Strategic advisor role
- Example: "Retainer for ongoing AI strategy + implementation"

#### 4.2 Position the Tier

"Based on what you've shared, I see this as a [Tier X] situation because [reasoning]."

**If they're a fit for higher tier:**
"That said, I'm sensing [additional challenges] that would benefit from [higher tier offering]. Worth exploring?"

### Phase 5: Next Steps (5 minutes)

#### 5.1 Summarize the Call

"Let me recap what we covered:
1. Your core challenge is [problem]
2. The strategic approach is [insight]
3. The solution path is [your offering]
4. The investment would be in the range of [ballpark]"

#### 5.2 Clear Next Action

Use AskUserQuestion tool:

**Question: "What's the next step?"**
- Header: "Next Action"
- Options:
  - "Send proposal (I'm ready to move forward)"
  - "Schedule follow-up (need to discuss with team)"
  - "Share case study (want proof of concept)"
  - "Not a fit right now (timing/budget)"

#### 5.3 Document the Call

After the call, create a summary:

```markdown
## Discovery Call Summary

**Date:** [Date]
**Lead:** [Name, Company]
**Duration:** [Minutes]

### Problem Identified
[Core problem in 1-2 sentences]

### Solution Positioned
[Your recommended approach]

### Tier Assignment
[Tier 1/2/3 with reasoning]

### Next Steps
- [ ] [Specific action 1]
- [ ] [Specific action 2]
- [ ] Follow-up date: [Date]

### Upsell Potential
[Note any signals for future expansion]

### Key Quotes
- "[Memorable quote about their pain]"
- "[Memorable quote about their vision]"

### Internal Notes
[Anything relevant for proposal, implementation, or future conversations]
```

## Call Recording Best Practices

**If recording calls for content (Nick's approach):**

1. **Get consent upfront:** "I may use parts of this call for educational content. Is that okay?"
2. **Extract clips with problems + your insights** (valuable content)
3. **Use different leads for different content pieces** (appears like volume)
4. **Batch production:** Schedule calls back-to-back on specific days

## Success Metrics

Track these for each discovery call:

| Metric | Target |
|--------|--------|
| Context gathered before call | 100% |
| Core problem identified | 100% |
| Solution positioned | 100% |
| Next step assigned | 100% |
| Close rate (discovery → proposal) | 30-50% |
| Upsell identified | 40-60% |

## Common Pitfalls to Avoid

❌ **Jumping into solutions without context**
✅ Always gather lead context first

❌ **Talking more than listening**
✅ 70/30 rule - they talk 70%, you talk 30%

❌ **Solving the surface problem**
✅ Dig deeper to find root cause

❌ **Giving away the full solution**
✅ Give strategic insight, save execution for paid engagement

❌ **Vague next steps**
✅ Assign clear, time-bound actions

## Integration with ClientTelos

After successful discovery calls, add the client to your ClientTelos system:

```bash
# Create client TELOS file
mkdir -p ~/.claude/PAI/USER/BUSINESS/CLIENTS/[client-name]

# Initialize structure
touch ~/.claude/PAI/USER/BUSINESS/CLIENTS/[client-name]/TELOS.md
touch ~/.claude/PAI/USER/BUSINESS/CLIENTS/[client-name]/ACTIVITY.md
mkdir -p ~/.claude/PAI/USER/BUSINESS/CLIENTS/[client-name]/TRANSCRIPTS
```

## Example Call Flow

**Erik:** "Hey [Lead Name], I see [Company] is working on [observation from research]. What prompted you to reach out?"

**Lead:** [Explains surface problem]

**Erik:** "Got it. Walk me through how you're handling [area] today."

**Lead:** [Describes current approach]

**Erik:** "What specifically isn't working about that?"

**Lead:** [Explains failures]

**Erik:** "What's this costing you - not just money, but time, opportunities?"

**Lead:** [Quantifies impact]

**Erik:** "Have you tried anything to fix this already?"

**Lead:** [Previous attempts]

**Erik:** "If I could wave a magic wand, what would the perfect solution look like?"

**Lead:** [Ideal state]

**Erik:** "Here's what I'm hearing... [summarize]. The reason [previous attempts] failed is [insight]. Here's the strategic approach I'd take... [direction]. The full implementation would be [scope] over [timeline] for roughly [investment]. Does that directionally make sense?"

**Lead:** [Response]

**Erik:** "Great. Let me send you [proposal/case study/follow-up]. I'll have that to you by [date]. Sound good?"

---

## Quick Reference

**Before Call:**
- [ ] Gather lead context
- [ ] Research company/person
- [ ] Formulate hypothesis

**During Call:**
- [ ] Extract current state
- [ ] Identify root problem
- [ ] Quantify cost/impact
- [ ] Understand ideal state
- [ ] Position solution
- [ ] Assign tier
- [ ] Set next steps

**After Call:**
- [ ] Document summary
- [ ] Send follow-up within 24hrs
- [ ] Add to CRM/ClientTelos
- [ ] Schedule next action

---

*Inspired by Nick Saraev's systematic approach to high-leverage discovery calls*
