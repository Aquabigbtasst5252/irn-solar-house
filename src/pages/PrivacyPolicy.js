import React from 'react';

const PrivacyPolicy = () => {
    
    const sectionStyle = "mb-8";
    const titleStyle = "text-2xl font-bold text-gray-800 mb-4";
    const subTitleStyle = "text-xl font-semibold text-gray-700 mt-6 mb-2";
    const textStyle = "text-gray-600 leading-relaxed";
    const listItemStyle = "ml-6 list-disc text-gray-600 leading-relaxed";

    return (
        <div className="bg-gray-50 min-h-screen font-sans">
             <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-40">
                <nav className="container mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
                    <a href="#/" className="flex items-center">
                         <img src="https://i.imgur.com/VtqESiF.png" alt="Logo" className="h-10 sm:h-12 w-auto"/>
                         <span className="ml-3 font-semibold text-lg sm:text-xl text-gray-800">IRN Solar House</span>
                    </a>
                    <a 
                        href="#/" 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base py-2 px-4 sm:px-5 rounded-full shadow-md hover:shadow-lg transition-all duration-300"
                    >
                        ← Back to Home
                    </a>
                </nav>
            </header>

            <main className="container mx-auto px-6 py-12">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto">
                    <h1 className={titleStyle}>Privacy Policy</h1>
                    <p className="text-sm text-gray-500 mb-6">Last updated: September 20, 2025</p>

                    <div className={sectionStyle}>
                        <p className={textStyle}>
                            IRN Solar House ("us", "we", or "our") operates the IRN Solar House website (the "Service"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.
                        </p>
                    </div>

                    <div className={sectionStyle}>
                        <h2 className={subTitleStyle}>Information Collection and Use</h2>
                        <p className={textStyle}>
                            We collect several different types of information for various purposes to provide and improve our Service to you. For our staff portal, this includes:
                        </p>
                        <ul className={listItemStyle}>
                            <li><strong>Email address:</strong> To uniquely identify you as a staff member.</li>
                            <li><strong>Name:</strong> To personalize your experience within the portal.</li>
                            <li><strong>Authentication Data via Google:</strong> If you sign in using Google, we receive basic profile information as provided by Google to authenticate your identity.</li>
                        </ul>
                    </div>

                    <div className={sectionStyle}>
                        <h2 className={subTitleStyle}>Use of Data</h2>
                        <p className={textStyle}>
                            IRN Solar House uses the collected data for the following purposes:
                        </p>
                         <ul className={listItemStyle}>
                            <li>To provide and maintain our internal Service</li>
                            <li>To manage your access as a staff member</li>
                            <li>To monitor the usage of our Service for security and operational purposes</li>
                        </ul>
                    </div>
                    
                    <div className={sectionStyle}>
                        <h2 className={subTitleStyle}>Security of Data</h2>
                        <p className={textStyle}>
                            The security of your data is important to us. We use Firebase, a service provided by Google, which employs industry-standard security measures to protect your information. However, remember that no method of transmission over the Internet or method of electronic storage is 100% secure.
                        </p>
                    </div>

                     <div className={sectionStyle}>
                        <h2 className={subTitleStyle}>Contact Us</h2>
                        <p className={textStyle}>
                            If you have any questions about this Privacy Policy, please contact us.
                        </p>
                    </div>

                    <p className="text-xs text-gray-400 mt-8">
                        Disclaimer: This is a template privacy policy. It is not legal advice. You should consult with a legal professional to ensure your policy is compliant with all applicable laws and regulations.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default PrivacyPolicy;
