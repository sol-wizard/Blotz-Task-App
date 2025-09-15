export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 md:p-12 text-center">
          {/* Logo Section */}
          <div className="mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">B</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">BLOTZ</h1>
            <div className="w-20 h-1 bg-blue-600 mx-auto rounded-full"></div>
          </div>
          
          {/* Main Message */}
          <div className="mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Transitioning to Mobile
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-2">
              We have discontinued our web application and are now exclusively focused on delivering 
              an exceptional mobile experience.
            </p>
            <p className="text-gray-600 text-lg leading-relaxed">
              Our mobile app is currently in <span className="font-semibold text-blue-600">beta testing phase</span>.
            </p>
          </div>

          {/* Beta Testing Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-8 mb-8">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-blue-900 mb-3">
                🚀 Join Our Beta Testing Program
              </h3>
              <p className="text-blue-800 leading-relaxed">
                Be among the first to experience our innovative mobile task management solution. 
                Help us shape the future of productivity.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="mailto:zhuaihui0206@gmail.com?subject=Beta Testing Application - BLOTZ Mobile&body=Hi BLOTZ Team,%0D%0A%0D%0AI'm interested in joining the beta testing program for your mobile app.%0D%0A%0D%0APlease let me know the next steps.%0D%0A%0D%0AThank you!"
                className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
              >
                📧 Apply via Email
              </a>
            </div>
          </div>

          {/* What to Expect */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 text-xl">⚡</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Native Performance</h4>
              <p className="text-sm text-gray-600">Optimized for mobile devices</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-purple-600 text-xl">🔔</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Smart Notifications</h4>
              <p className="text-sm text-gray-600">Stay updated on the go</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-orange-600 text-xl">🎯</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Enhanced UX</h4>
              <p className="text-sm text-gray-600">Intuitive mobile interface</p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-6">
            <p className="text-gray-500 text-sm">
              Questions or feedback? Reach out to us at{' '}
              <a href="mailto:zhuaihui0206@gmail.com" className="text-blue-600 hover:underline font-medium">
                zhuaihui0206@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
