document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('leadForm');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnIcon = submitBtn.querySelector('.btn-icon');
  const spinner = submitBtn.querySelector('.spinner');
  const statusAlert = document.getElementById('statusAlert');
  const successState = document.getElementById('successState');
  const resetBtn = document.getElementById('resetBtn');

  const floatingBtn = document.querySelector('.floating-website-btn');

  // Input elements
  const fullNameInput = document.getElementById('fullName');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  const companyInput = document.getElementById('company');
  const teamSizeHidden = document.getElementById('teamSize');
  const messageInput = document.getElementById('message');

  // Custom Select Elements
  const teamSizeContainer = document.getElementById('teamSizeContainer');
  const teamSizeTrigger = document.getElementById('teamSizeTrigger');
  const teamSizeDropdown = document.getElementById('teamSizeDropdown');
  const selectedTeamSizeLabel = document.getElementById('selectedTeamSizeLabel');
  const customOptions = teamSizeDropdown.querySelectorAll('.custom-option');

  // Custom Select Logic for Team Size
  teamSizeTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    teamSizeContainer.classList.toggle('open');
    teamSizeDropdown.classList.toggle('hidden');
  });

  customOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      const val = option.getAttribute('data-value');
      const text = option.querySelector('span').textContent;

      teamSizeHidden.value = val;
      selectedTeamSizeLabel.textContent = text;
      selectedTeamSizeLabel.classList.add('has-value');

      customOptions.forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');

      teamSizeContainer.classList.remove('open');
      teamSizeDropdown.classList.add('hidden');
    });
  });

  // Initialize Official International Telephone Input (intl-tel-input)
  let iti = null;
  if (window.intlTelInput) {
    const frI18n = (window.intlTelInputI18n && window.intlTelInputI18n.fr) ? window.intlTelInputI18n.fr : null;
    iti = window.intlTelInput(phoneInput, {
      initialCountry: 'bj', // Bénin par défaut !
      separateDialCode: true,
      preferredCountries: ['bj', 'tg', 'ci', 'sn', 'bf', 'ne', 'cm', 'fr'],
      autoPlaceholder: 'aggressive',
      i18n: frI18n,
      customPlaceholder: function(selectedCountryPlaceholder, selectedCountryData) {
        if (selectedCountryData && selectedCountryData.iso2 === 'bj') {
          return '90 00 00 00';
        }
        return selectedCountryPlaceholder;
      },
      utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@24.5.0/build/js/utils.js'
    });
  }

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!teamSizeContainer.contains(e.target)) {
      teamSizeContainer.classList.remove('open');
      teamSizeDropdown.classList.add('hidden');
    }
  });

  // Validation functions
  const validateEmail = (email) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
  };

  const setGroupError = (inputEl, hasError) => {
    const group = inputEl.closest('.form-group');
    if (hasError) {
      group.classList.add('has-error');
    } else {
      group.classList.remove('has-error');
    }
  };

  // Real-time error clearance
  [fullNameInput, emailInput, phoneInput, companyInput].forEach(input => {
    input.addEventListener('input', () => {
      setGroupError(input, false);
      hideAlert();
    });
  });

  const showAlert = (message, type = 'error') => {
    statusAlert.textContent = message;
    statusAlert.className = `alert-box alert-${type}`;
    statusAlert.classList.remove('hidden');
  };

  const hideAlert = () => {
    statusAlert.classList.add('hidden');
  };

  // Form submission handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    // Validate Required Fields
    let isValid = true;

    if (!fullNameInput.value.trim()) {
      setGroupError(fullNameInput, true);
      isValid = false;
    } else {
      setGroupError(fullNameInput, false);
    }

    if (!emailInput.value.trim() || !validateEmail(emailInput.value)) {
      setGroupError(emailInput, true);
      isValid = false;
    } else {
      setGroupError(emailInput, false);
    }

    // Validation Téléphone (Spécifique Bénin 10 chiffres "01 XX XX XX XX" + International)
    if (iti) {
      const countryData = iti.getSelectedCountryData();
      const rawVal = phoneInput.value.trim();
      const digitsOnly = rawVal.replace(/\D/g, '');

      if (!rawVal) {
        setGroupError(phoneInput, true);
        isValid = false;
      } else if (countryData && countryData.iso2 === 'bj') {
        // Bénin : 8 à 10 chiffres (ex: 90 00 00 00 ou 01 90 00 00 00)
        if (digitsOnly.length >= 8 && digitsOnly.length <= 10) {
          setGroupError(phoneInput, false);
        } else {
          setGroupError(phoneInput, true);
          isValid = false;
        }
      } else {
        if (!iti.isValidNumber()) {
          setGroupError(phoneInput, true);
          isValid = false;
        } else {
          setGroupError(phoneInput, false);
        }
      }
    } else {
      if (!phoneInput.value.trim() || phoneInput.value.trim().length < 6) {
        setGroupError(phoneInput, true);
        isValid = false;
      } else {
        setGroupError(phoneInput, false);
      }
    }

    if (!companyInput.value.trim()) {
      setGroupError(companyInput, true);
      isValid = false;
    } else {
      setGroupError(companyInput, false);
    }

    if (!isValid) {
      showAlert('Veuillez remplir tous les champs obligatoires avec un numéro de téléphone valide.', 'error');
      return;
    }

    // Get human text for teamSize if selected
    let selectedTeamSizeText = 'Non spécifié';
    if (teamSizeHidden.value) {
      const activeOpt = Array.from(customOptions).find(opt => opt.getAttribute('data-value') === teamSizeHidden.value);
      if (activeOpt) selectedTeamSizeText = activeOpt.querySelector('span').textContent;
    }

    // Prepare Full Phone Number formatted with dial code
    let fullPhone = '';
    if (iti) {
      const countryData = iti.getSelectedCountryData();
      const dial = countryData ? `+${countryData.dialCode}` : '+229';
      const entered = phoneInput.value.trim();
      fullPhone = entered.startsWith('+') ? entered : `${dial} ${entered}`;
    } else {
      fullPhone = phoneInput.value.trim();
    }

    // Prepare Payload
    const formData = {
      fullName: fullNameInput.value.trim(),
      email: emailInput.value.trim(),
      phone: fullPhone,
      company: companyInput.value.trim(),
      teamSize: selectedTeamSizeText,
      message: messageInput.value.trim() ? messageInput.value.trim() : 'Aucun message particulier',
      targetEmail: 'contact@cashless.africa',
      submittedAt: new Date().toISOString()
    };

    // UI Loading state
    submitBtn.disabled = true;
    btnText.textContent = 'Envoi en cours...';
    btnIcon.classList.add('hidden');
    spinner.classList.remove('hidden');

    try {
      let sentSuccessfully = false;

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          sentSuccessfully = true;
        } else {
          const resData = await response.json();
          showAlert(resData.message || 'Erreur lors de l\'envoi du formulaire.', 'error');
        }
      } catch (err) {
        console.error('Backend non disponible:', err);
        showAlert('Impossible de contacter le serveur backend.', 'error');
      }

      if (sentSuccessfully) {
        // Show Success UI & hide floating bottom button
        form.classList.add('hidden');
        document.querySelector('.hero-section').classList.add('hidden');
        successState.classList.remove('hidden');
        if (floatingBtn) floatingBtn.classList.add('hidden');
      } else {
        showAlert('Une erreur s\'est produite lors de l\'envoi. Veuillez réessayer.', 'error');
      }

    } catch (error) {
      console.error('Erreur d\'envoi:', error);
      showAlert('Erreur de connexion. Veuillez vérifier votre réseau.', 'error');
    } finally {
      // Reset Button State
      submitBtn.disabled = false;
      btnText.textContent = 'Envoyer';
      btnIcon.classList.remove('hidden');
      spinner.classList.add('hidden');
    }
  });

  // Reset form to submit another entry
  resetBtn.addEventListener('click', () => {
    form.reset();
    teamSizeHidden.value = '';
    selectedTeamSizeLabel.textContent = 'Sélectionnez la taille de l\'équipe';
    selectedTeamSizeLabel.classList.remove('has-value');
    customOptions.forEach(opt => opt.classList.remove('selected'));

    form.classList.remove('hidden');
    document.querySelector('.hero-section').classList.remove('hidden');
    successState.classList.add('hidden');
    if (floatingBtn) floatingBtn.classList.remove('hidden');
    hideAlert();
    [fullNameInput, emailInput, phoneInput, companyInput].forEach(input => {
      setGroupError(input, false);
    });
  });
});
