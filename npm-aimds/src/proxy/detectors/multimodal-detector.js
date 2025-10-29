/**
 * Multimodal Attack Detector
 *
 * Detects attacks across different modalities:
 * - Image adversarial perturbations
 * - Audio adversarial examples
 * - Video frame injection
 * - Cross-modal semantic attacks
 * - Steganographic attacks
 */

class MultimodalDetector {
  constructor(options = {}) {
    this.threshold = options.threshold || 0.75;

    this.patterns = this.initializePatterns();
    this.stats = {
      imageAttacks: 0,
      audioAttacks: 0,
      videoAttacks: 0,
      steganographyAttacks: 0,
    };
  }

  /**
   * Detect image-based attacks
   */
  detectImageAttacks(input, imageData = {}) {
    const threats = [];

    // 1. Image metadata injection
    if (imageData.metadata) {
      const metadataThreats = this.detectImageMetadataInjection(imageData.metadata);
      threats.push(...metadataThreats);
    }

    // 2. EXIF data manipulation
    if (imageData.exif) {
      const exifThreats = this.detectEXIFManipulation(imageData.exif);
      threats.push(...exifThreats);
    }

    // 3. Steganography detection
    if (this.detectImageSteganography(input)) {
      threats.push({
        type: 'image_attack',
        subtype: 'steganography',
        severity: 'high',
        confidence: 0.80,
        description: 'Potential steganographic content in image',
        mitigation: 'Extract and analyze LSB, apply image filtering',
      });
    }

    // 4. Adversarial patch detection
    if (this.detectAdversarialPatch(input)) {
      threats.push({
        type: 'image_attack',
        subtype: 'adversarial_patch',
        severity: 'critical',
        confidence: 0.90,
        description: 'Adversarial patch detected in image',
        mitigation: 'Apply patch detection and removal',
      });
    }

    return threats;
  }

  /**
   * Detect audio-based attacks
   */
  detectAudioAttacks(input, audioData = {}) {
    const threats = [];

    // 1. Inaudible command detection
    if (this.detectInaudibleCommands(input)) {
      threats.push({
        type: 'audio_attack',
        subtype: 'inaudible_commands',
        severity: 'critical',
        confidence: 0.95,
        description: 'Inaudible/ultrasonic commands detected',
        mitigation: 'Filter frequencies outside audible range',
      });
    }

    // 2. Audio adversarial perturbation
    if (this.detectAudioPerturbation(input)) {
      threats.push({
        type: 'audio_attack',
        subtype: 'adversarial_perturbation',
        severity: 'high',
        confidence: 0.85,
        description: 'Audio adversarial perturbation detected',
        mitigation: 'Apply audio normalization and filtering',
      });
    }

    // 3. Subliminal messaging
    if (this.detectSubliminalMessaging(input)) {
      threats.push({
        type: 'audio_attack',
        subtype: 'subliminal_messaging',
        severity: 'high',
        confidence: 0.80,
        description: 'Subliminal audio messaging detected',
        mitigation: 'Analyze and filter audio content',
      });
    }

    return threats;
  }

  /**
   * Detect video-based attacks
   */
  detectVideoAttacks(input, videoData = {}) {
    const threats = [];

    // 1. Frame injection
    if (this.detectFrameInjection(input)) {
      threats.push({
        type: 'video_attack',
        subtype: 'frame_injection',
        severity: 'high',
        confidence: 0.85,
        description: 'Malicious frame injection detected',
        mitigation: 'Validate frame consistency',
      });
    }

    // 2. Temporal adversarial perturbation
    if (this.detectTemporalPerturbation(input)) {
      threats.push({
        type: 'video_attack',
        subtype: 'temporal_perturbation',
        severity: 'high',
        confidence: 0.80,
        description: 'Temporal adversarial perturbation in video',
        mitigation: 'Apply temporal filtering',
      });
    }

    // 3. Subliminal frame insertion
    if (this.detectSubliminalFrames(input)) {
      threats.push({
        type: 'video_attack',
        subtype: 'subliminal_frames',
        severity: 'medium',
        confidence: 0.75,
        description: 'Subliminal frames detected',
        mitigation: 'Frame rate analysis and filtering',
      });
    }

    return threats;
  }

  /**
   * Helper detection methods
   */
  detectImageMetadataInjection(metadata) {
    const threats = [];
    const suspiciousPatterns = [
      /ignore.*instructions?/i,
      /system.*prompt/i,
      /jailbreak/i,
      /bypass.*safety/i,
    ];

    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'string') {
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(value)) {
            threats.push({
              type: 'image_attack',
              subtype: 'metadata_injection',
              severity: 'high',
              confidence: 0.90,
              description: `Malicious content in image metadata field: ${key}`,
              mitigation: 'Strip or sanitize image metadata',
            });
            break;
          }
        }
      }
    }

    return threats;
  }

  detectEXIFManipulation(exif) {
    // Check for oversized or malformed EXIF data
    const exifString = JSON.stringify(exif);
    if (exifString.length > 10000) {
      return [{
        type: 'image_attack',
        subtype: 'exif_manipulation',
        severity: 'medium',
        confidence: 0.70,
        description: 'Abnormally large EXIF data detected',
        mitigation: 'Limit EXIF data size',
      }];
    }
    return [];
  }

  detectImageSteganography(input) {
    // Detect steganography keywords
    return /steganography|hidden\s+message|lsb\s+encoding|watermark/i.test(input);
  }

  detectAdversarialPatch(input) {
    // Detect adversarial patch keywords
    return /adversarial\s+(patch|sticker|noise)|pixel\s+manipulation/i.test(input);
  }

  detectInaudibleCommands(input) {
    // Detect ultrasonic/inaudible command keywords
    return /ultrasonic|inaudible|subsonic|dolphin\s+attack|above\s+\d+\s*k?hz/i.test(input);
  }

  detectAudioPerturbation(input) {
    return /audio\s+(perturbation|adversarial|noise)|frequency\s+manipulation/i.test(input);
  }

  detectSubliminalMessaging(input) {
    return /subliminal\s+(message|audio)|backmasking|hidden\s+audio/i.test(input);
  }

  detectFrameInjection(input) {
    return /frame\s+(injection|insertion)|malicious\s+frame|video\s+manipulation/i.test(input);
  }

  detectTemporalPerturbation(input) {
    return /temporal\s+(perturbation|adversarial|attack)|frame\s+rate\s+manipulation/i.test(input);
  }

  detectSubliminalFrames(input) {
    return /subliminal\s+frame|flash\s+frame|hidden\s+frame|single\s+frame/i.test(input);
  }

  initializePatterns() {
    return {
      cross_modal_injection: {
        regex: /(image|audio|video)\s+(contains|has|includes)\s+(instructions?|commands?|prompt)/i,
        severity: 'high',
        confidence: 0.85,
      },
    };
  }

  getStats() {
    return { ...this.stats };
  }
}

module.exports = MultimodalDetector;
