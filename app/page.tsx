// ============================================
// HOME PAGE - Agent Dashboard
// ============================================

export default function Home() {
  return (
    <main className="min-h-screen p-8 bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">🤖 DeFi Agent</h1>
        <p className="text-gray-400 mb-8">Automated portfolio management on Base</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">📊 API Endpoints</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <code className="bg-gray-700 px-2 py-1 rounded">GET /api/health</code>
                <span className="text-gray-400 ml-2">System status</span>
              </li>
              <li>
                <code className="bg-gray-700 px-2 py-1 rounded">GET /api/allocate</code>
                <span className="text-gray-400 ml-2">View allocation</span>
              </li>
              <li>
                <code className="bg-gray-700 px-2 py-1 rounded">POST /api/allocate</code>
                <span className="text-gray-400 ml-2">Calculate & save</span>
              </li>
              <li>
                <code className="bg-gray-700 px-2 py-1 rounded">GET /api/rebalance</code>
                <span className="text-gray-400 ml-2">Preview rebalance</span>
              </li>
              <li>
                <code className="bg-gray-700 px-2 py-1 rounded">POST /api/rebalance</code>
                <span className="text-gray-400 ml-2">Execute rebalance</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">⚙️ Configuration</h2>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>Capital: <span className="text-green-400">$300</span></li>
              <li>Chain: <span className="text-blue-400">Base</span></li>
              <li>Max allocation: <span className="text-yellow-400">40%</span></li>
              <li>Min risk score: <span className="text-red-400">60</span></li>
              <li>Rebalance interval: <span className="text-purple-400">24h</span></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">🔗 Supported Protocols</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-700 rounded p-3">
              <div className="font-medium">Aave V3</div>
              <div className="text-gray-400">Lending</div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="font-medium">Compound V3</div>
              <div className="text-gray-400">Lending</div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="font-medium">Morpho</div>
              <div className="text-gray-400">Lending</div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="font-medium">Moonwell</div>
              <div className="text-gray-400">Lending</div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="font-medium">Aerodrome</div>
              <div className="text-gray-400">DEX</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
