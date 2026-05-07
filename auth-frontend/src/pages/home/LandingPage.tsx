import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Navbar } from '@/components/common/Navbar';
import { doctorSpecializations } from '@/constants/doctorSpecializations';
import { getApprovedDoctors, type ApprovedDoctor } from '@/services/public-doctors';

import { DoctorsSection } from './sections/DoctorsSection';
import { FeaturesSection } from './sections/FeaturesSection';
import { FooterSection } from './sections/FooterSection';
import { HeroSection } from './sections/HeroSection';
import { PricingSection } from './sections/PricingSection';

const locationOptions = ['All Locations', 'Chennai', 'Bangalore', 'Hyderabad', 'Mumbai', 'Delhi'];
const featuredSpecializations = ['Dermatologist', 'Pediatrician', 'Gynecologist'];

const LandingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [doctors, setDoctors] = useState<ApprovedDoctor[]>([]);
  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [showMoreSpecializations, setShowMoreSpecializations] = useState(false);
  const [showAllDoctors, setShowAllDoctors] = useState(false);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [doctorLoadError, setDoctorLoadError] = useState('');
  const [footerEmail, setFooterEmail] = useState('');
  const specializationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadDoctors = async () => {
      setIsLoadingDoctors(true);
      setDoctorLoadError('');
      try {
        const response = await getApprovedDoctors();
        setDoctors(response);
      } catch {
        setDoctors([]);
        setDoctorLoadError('Unable to load doctors right now.');
      } finally {
        setIsLoadingDoctors(false);
      }
    };

    void loadDoctors();
  }, []);

  const filteredDoctors = doctors.filter((doctor) => {
    const term = search.trim().toLowerCase();
    const specializationMatches =
      !selectedSpecialization ||
      (selectedSpecialization === 'Other'
        ? !doctorSpecializations.includes(doctor.specialization as (typeof doctorSpecializations)[number])
        : doctor.specialization === selectedSpecialization);
    const locationMatches =
      selectedLocation === 'All Locations' ||
      !selectedLocation ||
      (doctor.city || '').toLowerCase() === selectedLocation.toLowerCase();

    if (!term) {
      return specializationMatches && locationMatches;
    }

    const searchMatches = [doctor.name, doctor.specialization, doctor.clinicName, doctor.aboutDoctor ?? '', doctor.city]
      .join(' ')
      .toLowerCase()
      .includes(term);

    return specializationMatches && locationMatches && searchMatches;
  });

  const initialVisibleCount = filteredDoctors.length >= 8 ? 8 : 4;
  const visibleDoctors = showAllDoctors ? filteredDoctors : filteredDoctors.slice(0, initialVisibleCount);
  const remainingSpecializations = doctorSpecializations.filter(
    (specialization) => !featuredSpecializations.includes(specialization),
  );

  const scrollToDoctorCards = () => {
    document.getElementById('doctor-cards-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDoctorSearchSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setShowAllDoctors(true);
    scrollToDoctorCards();
  };

  const handleSpecializationSelect = (value: string) => {
    setSelectedSpecialization(value);
    setShowAllDoctors(false);
    scrollToDoctorCards();
  };

  useEffect(() => {
    if (!showMoreSpecializations) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!specializationsRef.current?.contains(event.target as Node)) {
        setShowMoreSpecializations(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showMoreSpecializations]);

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const targetId = location.hash.replace('#', '');
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [location.hash]);

  return (
    <div className="min-h-screen">
      <Navbar />

      <main id="home-section">
        <HeroSection
          featuredSpecializations={featuredSpecializations}
          handleDoctorSearchSubmit={handleDoctorSearchSubmit}
          handleSpecializationSelect={handleSpecializationSelect}
          locationOptions={locationOptions}
          remainingSpecializations={remainingSpecializations}
          search={search}
          selectedLocation={selectedLocation}
          selectedSpecialization={selectedSpecialization}
          setSearch={setSearch}
          setSelectedLocation={setSelectedLocation}
          setShowMoreSpecializations={setShowMoreSpecializations}
          showMoreSpecializations={showMoreSpecializations}
          specializationsRef={specializationsRef}
        />
        <DoctorsSection
          doctorLoadError={doctorLoadError}
          filteredDoctors={filteredDoctors}
          handleDoctorSearchSubmit={handleDoctorSearchSubmit}
          initialVisibleCount={initialVisibleCount}
          isLoadingDoctors={isLoadingDoctors}
          search={search}
          setSearch={setSearch}
          showAllDoctors={showAllDoctors}
          setShowAllDoctors={setShowAllDoctors}
          visibleDoctors={visibleDoctors}
        />
        <FeaturesSection />
        <PricingSection />
      </main>

      <FooterSection
        footerEmail={footerEmail}
        onFooterEmailChange={setFooterEmail}
        onSignupClick={() => navigate('/signup', { state: { initialEmail: footerEmail } })}
      />
    </div>
  );
};

export { LandingPage };
