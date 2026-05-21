import { UserSessionStats } from './FirebaseSessionService';

export class AIResponseGenerator {
  generateResponse(userMessage: string, stats: UserSessionStats): string {
    const messageLower = userMessage.toLowerCase();

    if (this.isGreeting(messageLower)) {
      return this.generateGreeting(stats);
    }

    if (this.isProgressQuery(messageLower)) {
      return this.generateProgressAnalysis(stats);
    }

    if (this.isFocusQuery(messageLower)) {
      return this.generateFocusAdvice(stats);
    }

    if (this.isMotivationQuery(messageLower)) {
      return this.generateMotivation(stats);
    }

    if (this.isDistractionQuery(messageLower)) {
      return this.generateDistractionAdvice(stats);
    }

    if (this.isStreakQuery(messageLower)) {
      return this.generateStreakAdvice(stats);
    }

    if (this.isCompletionQuery(messageLower)) {
      return this.generateCompletionAdvice(stats);
    }

    if (this.isHabitQuery(messageLower)) {
      return this.generateHabitAdvice(stats);
    }

    if (this.isStrengthQuery(messageLower)) {
      return this.generateStrengthAnalysis(stats);
    }

    return this.generateGeneralResponse(userMessage, stats);
  }

  private isGreeting(message: string): boolean {
    return /^(hi|hello|hey|greetings|good morning|good afternoon|good evening)/i.test(message);
  }

  private isProgressQuery(message: string): boolean {
    return /progress|recent|analyze|performance|how am i doing|how have i been/i.test(message);
  }

  private isFocusQuery(message: string): boolean {
    return /focus|concentrate|attention|improve focus|better focus/i.test(message);
  }

  private isMotivationQuery(message: string): boolean {
    return /motivat|inspire|encourage|start|begin|get started/i.test(message);
  }

  private isDistractionQuery(message: string): boolean {
    return /distract|interrupt|avoid distraction|stop getting distracted/i.test(message);
  }

  private isStreakQuery(message: string): boolean {
    return /streak|consistent|consistency|daily|everyday/i.test(message);
  }

  private isCompletionQuery(message: string): boolean {
    return /complet|finish|ending session|quit early/i.test(message);
  }

  private isHabitQuery(message: string): boolean {
    return /habit|routine|schedule|build|develop/i.test(message);
  }

  private isStrengthQuery(message: string): boolean {
    return /strength|good at|best|excel|doing well/i.test(message);
  }

  private generateGreeting(stats: UserSessionStats): string {
    if (stats.totalSessions === 0) {
      return "Hello! Welcome to Focus Path™! I'm here to help you build amazing focus habits. Complete your first session, and I'll be able to give you personalized insights and coaching based on your progress!";
    }

    const timeOfDay = new Date().getHours();
    let greeting = 'Hello';
    if (timeOfDay < 12) greeting = 'Good morning';
    else if (timeOfDay < 17) greeting = 'Good afternoon';
    else greeting = 'Good evening';

    let response = `${greeting}! `;

    if (stats.currentStreak > 0) {
      response += `You're on a ${stats.currentStreak}-day streak - way to stay consistent! `;
    }

    if (stats.recentSessionsCount > 0) {
      response += `You've completed ${stats.recentSessionsCount} sessions this week. `;
    }

    response += "How can I help you with your focus journey today?";

    return response;
  }

  private generateProgressAnalysis(stats: UserSessionStats): string {
    if (stats.totalSessions === 0) {
      return "You haven't completed any sessions yet! Start your first focus session to begin tracking your progress. I'll be here to help you analyze your patterns and improve over time.";
    }

    let response = `Here's your focus journey so far:\n\n`;

    response += `📊 Sessions: You've completed ${stats.completedSessions} out of ${stats.totalSessions} sessions (${stats.completionRate}% completion rate)\n`;
    response += `⏱️ Focus Time: ${Math.floor(stats.totalFocusTime / 60)} hours ${stats.totalFocusTime % 60} minutes total\n`;
    response += `⭐ XP Earned: ${stats.totalXPEarned} XP\n`;
    response += `🎯 Average Focus Score: ${stats.averageFocusScore}%\n\n`;

    if (stats.averageFocusScore >= 85) {
      response += "Your focus score is excellent! You're maintaining outstanding concentration during your sessions.";
    } else if (stats.averageFocusScore >= 70) {
      response += "Good focus performance! There's room for improvement, but you're building solid habits.";
    } else {
      response += "Your focus score suggests some challenges with distractions. Let's work on strategies to improve your concentration.";
    }

    if (stats.completionRate >= 80) {
      response += " Your completion rate is impressive - you're very good at seeing sessions through to the end!";
    } else if (stats.completionRate < 50) {
      response += " Try to complete more sessions fully - finishing what you start builds discipline and momentum.";
    }

    return response;
  }

  private generateFocusAdvice(stats: UserSessionStats): string {
    let response = "Here are personalized tips to improve your focus:\n\n";

    if (stats.averageDistractionsPerSession > 3) {
      response += "🎯 You're averaging " + stats.averageDistractionsPerSession.toFixed(1) + " distractions per session. Try:\n";
      response += "• Put your phone in another room\n";
      response += "• Close unnecessary browser tabs\n";
      response += "• Use website blockers for social media\n";
      response += "• Let others know you're in a focus session\n\n";
    }

    if (stats.commonDistractionPatterns.averagePauseCount > 2) {
      response += "⏸️ You pause sessions frequently. ";

      const patterns = stats.commonDistractionPatterns.pausePatterns;
      if (patterns) {
        // Provide specific feedback based on when pauses occur
        if (patterns.earlySessionPauses > patterns.midSessionPauses && patterns.earlySessionPauses > patterns.lateSessionPauses) {
          response += "Most pauses happen early in your sessions.\n";
          response += "• Your setup might not be complete before starting\n";
          response += "• Try a 5-minute pre-session checklist\n";
          response += "• Gather all materials, close distractions, set up workspace\n\n";
        } else if (patterns.lateSessionPauses > patterns.earlySessionPauses && patterns.lateSessionPauses > patterns.midSessionPauses) {
          response += "Most pauses happen late in your sessions.\n";
          response += "• You might be pushing beyond your natural focus limit\n";
          response += "• Try shorter sessions (20-25 min) to build endurance\n";
          response += "• Take a proper break when session ends\n\n";
        } else {
          response += "Pauses are spread throughout your sessions.\n";
          response += "• Consider what triggers each pause\n";
          response += "• Prepare everything you need before starting\n";
          response += "• Use the 'just 2 more minutes' technique when tempted to pause\n\n";
        }

        if (patterns.longPauses > 0) {
          response += `⚠️ You have ${patterns.longPauses} pauses over 2 minutes. Long pauses break your flow state.\n`;
          response += "• If you need a break, end the session and start fresh\n";
          response += "• Pausing should be for quick adjustments only\n\n";
        }

        if (patterns.averagePauseDuration > 60) {
          response += `⏱️ Your average pause is ${patterns.averagePauseDuration} seconds. Keep pauses under 30 seconds for quick adjustments.\n\n`;
        }
      } else {
        response += "Consider:\n";
        response += "• Starting with shorter, achievable session lengths\n";
        response += "• Taking proper breaks between sessions\n";
        response += "• Preparing everything you need before starting\n\n";
      }
    }

    if (stats.averageSessionLength < 25) {
      response += "⏱️ Your sessions average " + stats.averageSessionLength + " minutes. Try gradually increasing to 25-30 minutes for optimal focus flow.\n\n";
    }

    if (stats.commonDistractionPatterns.mostProductiveTimeOfDay) {
      response += `📅 You seem most productive in the ${stats.commonDistractionPatterns.mostProductiveTimeOfDay}. Try scheduling important work during this time!`;
    }

    if (stats.averageDistractionsPerSession <= 1 && stats.averageFocusScore >= 85) {
      response = "You're already doing amazing with focus! Your distraction management is excellent. Keep up these great habits:\n\n";
      response += "• Maintain your current environment setup\n";
      response += "• Continue your pre-session preparation routine\n";
      response += "• Consider challenging yourself with longer sessions\n";
      response += "• Share your strategies to help others!";
    }

    return response;
  }

  private generateMotivation(stats: UserSessionStats): string {
    if (stats.totalSessions === 0) {
      return "Every expert was once a beginner! Starting is the hardest part, and you're here - that's what matters. Your first session will be the foundation of an amazing focus journey. Let's do this!";
    }

    let response = "";

    if (stats.currentStreak >= 7) {
      response = `You've maintained a ${stats.currentStreak}-day streak! That takes real commitment. You're not just building focus skills - you're building a powerful habit that will serve you for life. Keep this momentum going!`;
    } else if (stats.currentStreak >= 3) {
      response = `${stats.currentStreak} days in a row! You're building momentum. The compound effect of daily practice is powerful - each session makes the next one easier. You've got this!`;
    } else if (stats.totalSessions >= 10) {
      response = `${stats.totalSessions} sessions completed! You've proven you can do this. Every session is an investment in your future self. The discipline you're building now will pay dividends forever.`;
    } else {
      response = `You've started your focus journey and that's the hardest step! ${stats.totalSessions} sessions down, countless achievements ahead. Remember: progress, not perfection!`;
    }

    if (stats.totalXPEarned > 0) {
      response += ` You've earned ${stats.totalXPEarned} XP - that's ${stats.totalXPEarned} moments of growth and progress!`;
    }

    return response;
  }

  private generateDistractionAdvice(stats: UserSessionStats): string {
    if (stats.totalSessions === 0) {
      return "Distractions are normal! The key is creating an environment that minimizes them. Before your first session, try: putting your phone away, closing social media, and letting others know you need focus time.";
    }

    let response = "Let's tackle distractions together!\n\n";

    const distractionsPerSession = stats.averageDistractionsPerSession;

    if (distractionsPerSession <= 1) {
      response += "You're doing exceptionally well! Averaging " + distractionsPerSession.toFixed(1) + " distractions per session is excellent. Your distraction management is a strength!";
    } else if (distractionsPerSession <= 3) {
      response += "📊 Current: " + distractionsPerSession.toFixed(1) + " distractions per session\n\n";
      response += "You're doing okay, but there's room to improve:\n\n";
      response += "1. Environment Setup (5 min before):\n";
      response += "   • Phone in another room\n";
      response += "   • Close email/chat apps\n";
      response += "   • Prepare all materials\n\n";
      response += "2. Digital Barriers:\n";
      response += "   • Use website blockers\n";
      response += "   • Turn off notifications\n";
      response += "   • Use full-screen mode\n\n";
      response += "3. Physical Boundaries:\n";
      response += "   • Closed door or headphones\n";
      response += "   • 'Do not disturb' sign\n";
      response += "   • Clear workspace";
    } else {
      response += "📊 You're averaging " + distractionsPerSession.toFixed(1) + " distractions per session - let's work on this!\n\n";
      response += "HIGH-IMPACT CHANGES:\n\n";
      response += "1. Phone = Biggest Distraction\n";
      response += "   • Put it in a different room\n";
      response += "   • Or use a locked drawer\n";
      response += "   • Not just silent - out of sight!\n\n";
      response += "2. Browser Setup\n";
      response += "   • Install Freedom or Cold Turkey\n";
      response += "   • Block social media during sessions\n";
      response += "   • Close all non-essential tabs\n\n";
      response += "3. Environment Control\n";
      response += "   • Tell family/roommates your schedule\n";
      response += "   • Use noise-canceling headphones\n";
      response += "   • Face away from foot traffic\n\n";
      response += "Try these for your next 3 sessions and watch your focus score improve!";
    }

    // Add pause pattern insights if available
    const patterns = stats.commonDistractionPatterns.pausePatterns;
    if (patterns && stats.commonDistractionPatterns.averagePauseCount > 1) {
      response += "\n\n⏸️ INTERRUPTION INSIGHTS:\n\n";

      if (patterns.earlySessionPauses > patterns.midSessionPauses && patterns.earlySessionPauses > patterns.lateSessionPauses) {
        response += "You're pausing most often at the start of sessions. This suggests incomplete preparation.\n";
        response += "• Create a pre-session ritual (2-3 minutes)\n";
        response += "• Bathroom, water, materials, phone away\n";
        response += "• Don't start until you're truly ready\n";
      } else if (patterns.lateSessionPauses > patterns.earlySessionPauses) {
        response += "You're pausing toward the end of sessions. This is natural fatigue.\n";
        response += "• Your current session length might be too long\n";
        response += "• Try 20-minute sessions first, then build up\n";
        response += "• Celebrate finishing strong instead of fading\n";
      }

      if (patterns.longPauses >= 2) {
        response += "\n⚠️ Multiple long pauses detected. If you need more than 30 seconds, end the session and take a proper break. Your brain needs recovery, not a rushed pause!";
      }
    }

    return response;
  }

  private generateStreakAdvice(stats: UserSessionStats): string {
    if (stats.currentStreak === 0) {
      return `Let's build your streak! ${stats.totalSessions > 0 ? 'You\'ve completed sessions before - time to build consistency!' : 'Start today!'} Just one session a day creates compound growth. Even 15-20 minutes counts. The streak isn't about perfection - it's about showing up consistently. Ready to start?`;
    }

    if (stats.currentStreak === 1) {
      return "Day 1 of your streak! The first step is always the hardest. Come back tomorrow and you'll have a 2-day streak. Small daily actions lead to massive results over time!";
    }

    if (stats.currentStreak >= 7) {
      return `${stats.currentStreak} days! You've built serious momentum. You're in the top tier of committed users. This consistency is transforming your focus abilities. Your longest streak is ${stats.longestStreak} days - can you beat it?`;
    }

    if (stats.currentStreak >= 3) {
      return `${stats.currentStreak} days strong! You're past the hardest part. Keep this going - you're building a habit that becomes automatic around day 21. You've got ${21 - stats.currentStreak} days until it feels natural. Keep showing up!`;
    }

    return `${stats.currentStreak}-day streak! Every day you show up, you're rewiring your brain for success. Don't break the chain! Your longest streak is ${stats.longestStreak} days - you've done it before, you can do it again.`;
  }

  private generateCompletionAdvice(stats: UserSessionStats): string {
    if (stats.totalSessions === 0) {
      return "Completion tip: Start with shorter sessions (15-20 min) that you know you can finish. It's better to complete a short session than quit a long one. Build confidence with small wins!";
    }

    const rate = stats.completionRate;

    if (rate >= 90) {
      return `${rate}% completion rate - that's exceptional! You have incredible discipline. This ability to finish what you start is a superpower that will serve you in every area of life. Keep it up!`;
    }

    if (rate >= 75) {
      return `${rate}% completion rate is solid! You generally see things through. To hit 90%+, try:\n\n• Make sure you're well-rested before sessions\n• Choose session lengths you can realistically complete\n• Prepare everything you need beforehand\n• Remember: finishing builds momentum for the next session`;
    }

    if (rate >= 50) {
      return `${rate}% completion rate shows you're often stopping sessions early. Let's fix this:\n\n1. Start Smaller: Choose shorter sessions you KNOW you can finish\n2. Pre-Session Prep: Use the bathroom, get water, gather materials\n3. Mindset Shift: Each completed session builds your discipline muscle\n4. Track Progress: Notice how good completing feels vs quitting\n\nNext session: commit to finishing, no matter what!`;
    }

    return `Your ${rate}% completion rate suggests you're struggling to finish sessions. Here's the truth: completing sessions is MORE important than their length.\n\nAction Plan:\n• Next 3 sessions: Set timer for just 15 minutes\n• Focus on finishing, not perfection\n• Celebrate each completion\n• Gradually increase length as confidence builds\n\nFinishing builds discipline. Discipline builds confidence. Confidence builds results!`;
  }

  private generateHabitAdvice(stats: UserSessionStats): string {
    let response = "Let's build bulletproof focus habits!\n\n";

    if (stats.commonDistractionPatterns.mostProductiveTimeOfDay) {
      response += `📅 Best Time: You're most productive in the ${stats.commonDistractionPatterns.mostProductiveTimeOfDay}. Make this your sacred focus time!\n\n`;
    }

    response += "🔄 HABIT BUILDING FRAMEWORK:\n\n";
    response += "1. Trigger (Make it Obvious)\n";
    response += "   • Same time each day\n";
    response += "   • Same location\n";
    response += "   • Visual reminder (sticky note)\n\n";

    response += "2. Routine (Make it Easy)\n";
    response += "   • Start with 20 minutes\n";
    response += "   • Have materials ready\n";
    response += "   • One click to begin\n\n";

    response += "3. Reward (Make it Satisfying)\n";
    response += "   • Track your streak\n";
    response += "   • Celebrate completions\n";
    response += "   • Watch XP grow\n\n";

    if (stats.currentStreak >= 3) {
      response += `You already have a ${stats.currentStreak}-day streak - you're building the habit! Keep the momentum going.`;
    } else if (stats.totalSessions >= 5) {
      response += `You've done ${stats.totalSessions} sessions. Now add consistency: commit to the same time each day for 21 days!`;
    } else {
      response += "Start small: commit to just 15 minutes, same time, for 7 days straight. That's the foundation!";
    }

    return response;
  }

  private generateStrengthAnalysis(stats: UserSessionStats): string {
    if (stats.totalSessions === 0) {
      return "You're about to discover your strengths! Complete a few sessions and I'll help you identify what you're naturally good at and how to leverage those strengths.";
    }

    let strengths: string[] = [];
    let response = "Here are your focus strengths:\n\n";

    if (stats.completionRate >= 80) {
      strengths.push(`✅ Completion Master: ${stats.completionRate}% completion rate - you have excellent discipline and follow-through!`);
    }

    if (stats.averageFocusScore >= 85) {
      strengths.push(`🎯 Focus Expert: ${stats.averageFocusScore}% average focus score - your concentration skills are exceptional!`);
    }

    if (stats.currentStreak >= 7) {
      strengths.push(`🔥 Consistency Champion: ${stats.currentStreak}-day streak - you excel at showing up daily!`);
    }

    if (stats.averageDistractionsPerSession <= 1.5) {
      strengths.push(`🛡️ Distraction Defender: Only ${stats.averageDistractionsPerSession.toFixed(1)} distractions per session - you've mastered your environment!`);
    }

    if (stats.averageSessionLength >= 40) {
      strengths.push(`⏱️ Endurance Pro: ${stats.averageSessionLength} minute average sessions - you can maintain focus for extended periods!`);
    }

    if (stats.totalFocusTime >= 300) {
      strengths.push(`📊 Volume Leader: ${Math.floor(stats.totalFocusTime / 60)} hours of focus time - you put in the work!`);
    }

    if (strengths.length === 0) {
      response += "You're still building your strengths! Keep completing sessions and patterns will emerge. Remember:\n\n";
      response += "• Every session builds skills\n";
      response += "• Consistency creates excellence\n";
      response += "• Your strengths are developing!\n\n";
      response += "Complete 5 more sessions and let's analyze what you're naturally good at!";
    } else {
      response += strengths.join("\n\n") + "\n\n";
      response += "These aren't just stats - they're evidence of real skills you're developing. Leverage these strengths as you continue growing!";
    }

    return response;
  }

  private generateGeneralResponse(_userMessage: string, stats: UserSessionStats): string {
    if (stats.totalSessions === 0) {
      return "I'm here to help you build amazing focus habits! Start your first session, and I'll be able to give you personalized insights based on your actual progress. What specific aspect of focus are you interested in? I can help with building habits, avoiding distractions, staying motivated, or improving completion rates!";
    }

    return `I'm analyzing your focus patterns to give you the best advice! With ${stats.totalSessions} sessions completed and a ${stats.averageFocusScore}% average focus score, I can help you improve.\n\nTry asking me about:\n• "How can I improve my focus?"\n• "Analyze my recent progress"\n• "How do I avoid distractions?"\n• "Help me build better habits"\n• "What are my strengths?"\n\nWhat would you like to work on?`;
  }
}

export const aiResponseGenerator = new AIResponseGenerator();
