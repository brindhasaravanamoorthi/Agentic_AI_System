// Quick test script to verify agent system
import 'dotenv/config';
import { agentService } from './services/agent.service';

async function testAgents() {
  console.log('🧪 Testing OmniAgent System...\n');

  try {
    console.log('1️⃣  Testing Ollama connection...');
    const testResult = await agentService.testConnection();
    console.log('✅ Result:', testResult.success ? 'SUCCESS' : 'FAILED');
    
    if (testResult.success) {
      console.log('\n2️⃣  Testing agent workflow...');
      const chatResult = await agentService.processUserQuery(
        'What should I do if inventory is low?'
      );
      
      console.log('\n📊 Agent Response:');
      console.log(chatResult.data?.response || chatResult.error);
      
      console.log('\n📈 Decision Status:', chatResult.data?.decision.status);
    } else {
      console.error('❌ Ollama connection failed:', testResult.error);
      console.log('\n💡 Make sure Ollama is running:');
      console.log('   ollama serve');
      console.log('   ollama pull phi4-mini:latest');
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAgents();
