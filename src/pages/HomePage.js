import React, { useState, useEffect } from 'react';
import { SunIcon, ShieldCheckIcon, WrenchScrewdriverIcon, MapPinIcon } from '../components/ui/Icons';

const HomePage = ({ content, categories }) => {
    // --- State for Advertisement Slider ---
    const adImages = ['/2.png', '/3.png']; // Updated image list
    const [currentAdIndex, setCurrentAdIndex] = useState(0);
    
    // --- State for Responsive Video ---
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const adTimer = setInterval(() => {
            setCurrentAdIndex(prevIndex => (prevIndex + 1) % adImages.length);
        }, 5000); // Change ad image every 5 seconds

        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);

        // Cleanup timers and event listeners
        return () => {
            clearInterval(adTimer);
            window.removeEventListener('resize', handleResize);
        };
    }, [adImages.length]);

    const defaultContent = {
        whyChooseTitle: "Why Choose IRN Solar House?",
        whyChooseSubtitle: "We are committed to providing top-tier solar technology and exceptional service across Sri Lanka.",
        feature1Title: "Electricity Saving",
        feature1Text: "Reduce your electricity bills and carbon footprint. Make a smart investment for your wallet and the planet.",
        feature2Title: "Premium Quality Products",
        feature2Text: "We import and supply only best-in-class solar panels, inverters, and batteries from trusted international manufacturers.",
        feature3Title: "Expert Installation",
        feature3Text: "Our certified technicians ensure a seamless and safe installation process, tailored to your property's specific needs.",
        contactHotline: "+94 77 750 1836",
        contactEmail: "easytime1@gmail.com",
        contactAddress: "No.199/8, Ranawiru Helasiri Mawatha, Boragodawatta, Minuwangoda, Sri Lanka.",
    };

    const pageContent = content || defaultContent;

    return (
        <div className="bg-white text-gray-800 font-sans">
             <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fadeIn {
                    animation: fadeIn 1.5s ease-in-out forwards;
                }
            `}</style>

            <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-40">
                <nav className="container mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
                    <a href="#/" className="flex items-center">
                         <img src="https://i.imgur.com/VtqESiF.png" alt="Logo" className="h-10 sm:h-12 w-auto"/>
                         <span className="ml-3 font-semibold text-lg sm:text-xl text-gray-800">IRN Solar House</span>
                    </a>
                    <div className="hidden md:flex items-center space-x-8 font-medium text-gray-600">
                        <a href="#about" className="hover:text-yellow-600 transition-colors">About Us</a>
                        <a href="#products" className="hover:text-yellow-600 transition-colors">Products</a>
                        <a href="#showrooms" className="hover:text-yellow-600 transition-colors">Showrooms</a>
                        <a href="#contact" className="hover:text-yellow-600 transition-colors">Contact</a>
                    </div>
                    <a href="#/signin" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base py-2 px-4 sm:px-5 rounded-full shadow-md hover:shadow-lg transition-all duration-300">
                        Staff Sign In
                    </a>
                </nav>
            </header>

            <section className="relative h-screen w-full flex items-center justify-center text-white overflow-hidden">
                <video 
                    key={isMobile ? 'mobile' : 'desktop'} // Key forces re-render when switching between videos
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    className="absolute z-0 w-full h-full object-cover"
                >
                    <source 
                        src={isMobile ? "/mobile.mp4" : "/Blue and Black Gradient Abstract YouTube Intro Video.mp4"} 
                        type="video/mp4" 
                    />
                    Your browser does not support the video tag.
                </video>
                
            </section>
            
            <section id="about" className="py-16 sm:py-24 bg-white">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-800">{pageContent.whyChooseTitle}</h2>
                    <p className="text-gray-600 mb-16 max-w-3xl mx-auto text-lg">{pageContent.whyChooseSubtitle}</p>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-gray-50 p-8 rounded-xl transition-shadow hover:shadow-xl"><div className="flex justify-center mb-4"><SunIcon /></div><h3 className="text-xl font-semibold mb-2">{pageContent.feature1Title}</h3><p className="text-gray-600">{pageContent.feature1Text}</p></div>
                        <div className="bg-gray-50 p-8 rounded-xl transition-shadow hover:shadow-xl"><div className="flex justify-center mb-4"><ShieldCheckIcon /></div><h3 className="text-xl font-semibold mb-2">{pageContent.feature2Title}</h3><p className="text-gray-600">{pageContent.feature2Text}</p></div>
                        <div className="bg-gray-50 p-8 rounded-xl transition-shadow hover:shadow-xl"><div className="flex justify-center mb-4"><WrenchScrewdriverIcon /></div><h3 className="text-xl font-semibold mb-2">{pageContent.feature3Title}</h3><p className="text-gray-600">{pageContent.feature3Text}</p></div>
                    </div>
                </div>
            </section>

            <section className="py-16 sm:py-24 bg-gray-100">
                <div className="container mx-auto px-6">
                    <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16 text-gray-800">Our Featured Products</h2>
                    <div className="relative w-full max-w-5xl mx-auto">
                        <div className="grid bg-white rounded-2xl overflow-hidden shadow-2xl p-4">
                            {adImages.map((image, index) => (
                                <img
                                    key={`ad-${image}`}
                                    src={image}
                                    alt={`Advertisement ${index + 1}`}
                                    className={`w-full h-auto object-contain transition-opacity duration-1000 ease-in-out col-start-1 row-start-1 ${index === currentAdIndex ? 'opacity-100' : 'opacity-0'}`}
                                />
                            ))}
                        </div>
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-10 flex space-x-3">
                            {adImages.map((_, index) => (
                                <button
                                    key={`dot-${index}`}
                                    onClick={() => setCurrentAdIndex(index)}
                                    className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentAdIndex ? 'bg-blue-600 scale-125' : 'bg-gray-400 hover:bg-gray-600'}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section id="products" className="py-16 sm:py-24 bg-white">
                <div className="container mx-auto px-6">
                    <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16 text-gray-800">Our Core Products</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                         {(categories || []).map(category => (
                            <a key={category.id} href={`#/products/${category.id}`} className="cursor-pointer rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-300 group">
                                <img src={category.imageUrl} alt={category.name} className="w-full h-64 object-cover"/>
                                <div className="p-6 bg-white">
                                    <h3 className="text-2xl font-bold mb-2 text-gray-900 group-hover:text-blue-600 transition-colors">{category.name}</h3>
                                    <p className="text-gray-700">{category.description}</p>
                                </div>
                            </a>
                         ))}
                    </div>
                </div>
            </section>

            <section id="hybrid-ac" className="py-16 sm:py-24 bg-gray-50">
                <div className="container mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="order-2 lg:order-1">
                            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">Introducing the Future of Cooling</h2>
                            <p className="text-yellow-600 font-semibold text-lg mb-4">Solar Hybrid Air Conditioners</p>
                            <p className="text-gray-600 mb-6">
                                Experience revolutionary cooling technology that runs on free solar energy during the day and automatically switches to the national grid at night. Our hybrid ACs drastically reduce your electricity bills while providing uninterrupted comfort, 24/7. It's the smartest way to stay cool in Sri Lanka.
                            </p>
                            <a href="#contact" className="bg-green-600 hover:bg-green-700 text-white font-bold text-lg py-3 px-8 rounded-full shadow-md hover:shadow-lg transition-all duration-300">
                                Enquire Now
                            </a>
                        </div>
                        <div className="order-1 lg:order-2">
                            <video autoPlay loop muted playsInline className="rounded-2xl shadow-2xl w-full">
                                <source src="/Solar_AC_Hybrid_Power_Video_Generation.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    </div>
                </div>
            </section>

            {pageContent.showrooms && pageContent.showrooms.length > 0 && (
                <section id="showrooms" className="py-16 sm:py-24 bg-white">
                    <div className="container mx-auto px-6">
                        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16 text-gray-800">Visit Our Showrooms</h2>
                        <div className="flex flex-wrap justify-center gap-8"> 
                            {pageContent.showrooms.map((showroom, index) => (
                                <div key={index} className="bg-gray-50 p-6 rounded-xl shadow-lg text-center transform hover:-translate-y-2 transition-transform duration-300 w-full max-w-sm">
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">{showroom.name}</h3>
                                    <p className="text-gray-600 mb-4 h-16">{showroom.address}</p>
                                    <a href={showroom.mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                                        <MapPinIcon />
                                        <span className="ml-2">View on Map</span>
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            <section id="contact" className="py-20 bg-gray-800 text-white">
                <div className="container mx-auto px-6">
                    <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-yellow-400">Ready to Go Solar?</h2>
                    <div className="max-w-2xl mx-auto text-center">
                        <p className="mb-8 text-lg text-gray-300">Contact us today for a free consultation and quote. Our experts will help you design the perfect solar system for your needs.</p>
                        <p className="text-xl font-bold">Hotline: {pageContent.contactHotline}</p>
                        <p className="text-xl font-bold">Email: {pageContent.contactEmail}</p>
                        <p className="mt-4 text-gray-400">{pageContent.contactAddress}</p>
                    </div>
                </div>
            </section>
            
            <footer className="bg-gray-900 text-white py-6"><div className="container mx-auto px-6 text-center text-sm text-gray-400"><p>© {new Date().getFullYear()} IRN Solar House. All Rights Reserved.</p></div></footer>
        </div>
    );
};

export default HomePage;

