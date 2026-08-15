import { useState } from "react";

function App() {
  const [crop, setCrop] = useState("");
  const [location, setLocation] = useState("");
  const [image, setImage] = useState(null);

  const [riskData, setRiskData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [imageData, setImageData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [isListening, setIsListening] = useState(false);
  // =====================================================
// TEXT TO SPEECH
// =====================================================

const speakAnswer = (text) => {
  if (!("speechSynthesis" in window)) {
    alert(
      "Voice output is not supported in this browser."
    );
    return;
  }

  // Stop previous speech
  window.speechSynthesis.cancel();

  const speech = new SpeechSynthesisUtterance(text);

  speech.lang = "en-IN";
  speech.rate = 0.9;
  speech.pitch = 1;
  speech.volume = 1;

  speech.onstart = () => {
    console.log("🔊 AI speech started");
  };

  speech.onend = () => {
    console.log("🔊 AI speech ended");
  };

  speech.onerror = (event) => {
    console.error(
      "🔊 Speech synthesis error:",
      event.error
    );
  };

  // Make sure speech engine is active
  window.speechSynthesis.resume();

  window.speechSynthesis.speak(speech);
};

  
   // =====================================================
// VOICE ASSISTANT - VOICE INPUT + AI RESPONSE
// =====================================================

const startVoiceAssistant = () => {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert(
      "Voice recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge."
    );
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = "en-IN";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    setIsListening(true);
    setVoiceText("Listening...");
  };

  recognition.onresult = (event) => {
    const transcript =
      event.results[0][0].transcript;

    setVoiceText(transcript);
    setIsListening(false);

    // =================================================
    // VOICE COMMAND PROCESSING
    // =================================================
   const command = transcript.toLowerCase();

let answer = "";

// =================================================
// 1. COMPLETE CROP REPORT
// =================================================
if (
  command.includes("complete report") ||
  command.includes("full report") ||
  command.includes("crop report")
) {
  if (riskData && weatherData) {
    answer =
      `Here is your complete crop report. ` +
      `Overall crop risk is ${riskData.overall_risk} percent. ` +
      `Crop health is ${riskData.crop_health} out of 100. ` +
      `Disease risk is ${riskData.disease_risk} percent. ` +
      `Pest risk is ${riskData.pest_risk} percent. ` +
      `Weather risk is ${weatherData.weather_risk} percent. ` +
      `Temperature is ${weatherData.temperature} degrees Celsius. ` +
      `Humidity is ${weatherData.humidity} percent. ` +
      `Rain probability is ${weatherData.rain_probability} percent.`;
  } else {
    answer = "Please analyze your crop first.";
  }
}

// =================================================
// 2. PREVENTIVE ACTIONS
// =================================================
else if (
  command.includes("what should i do") ||
  command.includes("what should we do") ||
  command.includes("preventive") ||
  command.includes("prevention") ||
  command.includes("action") ||
  command.includes("actions")
) {
  if (
    riskData &&
    riskData.preventive_actions &&
    riskData.preventive_actions.length > 0
  ) {
    answer =
      "Here are the recommended preventive actions: " +
      riskData.preventive_actions.join(". ");
  } else {
    answer =
      "Please analyze your crop first to get preventive actions.";
  }
}

// =================================================
// 3. DISEASE RISK
// =================================================
else if (
  command.includes("disease risk") ||
  command.includes("disease")
) {
  if (riskData) {
    answer =
      `The disease risk for your crop is ${riskData.disease_risk} percent.`;
  } else {
    answer =
      "Please analyze your crop first.";
  }
}

// =================================================
// 4. PEST RISK
// =================================================
else if (
  command.includes("pest risk") ||
  command.includes("pest")
) {
  if (riskData) {
    answer =
      `The pest risk for your crop is ${riskData.pest_risk} percent.`;
  } else {
    answer =
      "Please analyze your crop first.";
  }
}

// =================================================
// 5. WEATHER INFORMATION
// =================================================
else if (
  command.includes("weather") ||
  command.includes("temperature") ||
  command.includes("humidity") ||
  command.includes("rain")
) {
  if (weatherData) {
    answer =
      `The current weather risk is ${weatherData.weather_risk} percent. ` +
      `The temperature is ${weatherData.temperature} degrees Celsius. ` +
      `Humidity is ${weatherData.humidity} percent. ` +
      `Rain probability is ${weatherData.rain_probability} percent.`;
  } else {
    answer =
      "Please analyze your crop first so I can check the weather information.";
  }
}

// =================================================
// 6. CROP HEALTH
// =================================================
else if (
  command.includes("crop health") ||
  command.includes("healthy") ||
  command.includes("health")
) {
  if (riskData) {
    answer =
      `Your crop health score is ${riskData.crop_health} out of 100.`;
  } else {
    answer =
      "Please analyze your crop first.";
  }
}

// =================================================
// 7. OVERALL CROP RISK
// =================================================
else if (
  command.includes("overall risk") ||
  command.includes("crop risk") ||
  command.includes("risk")
) {
  if (riskData) {
    answer =
      `Your overall crop risk is ${riskData.overall_risk} percent. ` +
      `Crop health is ${riskData.crop_health} out of 100. ` +
      `Disease risk is ${riskData.disease_risk} percent. ` +
      `Pest risk is ${riskData.pest_risk} percent. ` +
      `Weather risk is ${riskData.weather_risk} percent.`;
  } else {
    answer =
      "Please analyze your crop first so I can provide the risk information.";
  }
}

// =================================================
// 8. AI RISK EXPLANATION
// =================================================
else if (
  command.includes("explain") ||
  command.includes("why") ||
  command.includes("analysis")
) {
  if (riskData && riskData.risk_explanation) {
    answer = riskData.risk_explanation;
  } else {
    answer =
      "Please analyze your crop first to get the AI risk explanation.";
  }
}
  
 

// =================================================
// 9. DEFAULT RESPONSE
// =================================================
else {
  answer =
    "I can tell you about overall crop risk, disease risk, pest risk, weather conditions, crop health, preventive actions, or the complete crop report.";
}

// =================================================
// SHOW AI ANSWER
// =================================================

setVoiceText(
  `${transcript} → ${answer}`
);

speakAnswer(answer);
  };
   
    recognition.onerror = (event) => {
    console.error(
      "Voice recognition error:",
      event.error
    );

    setVoiceText(
      "Could not understand your voice."
    );

    setIsListening(false);
  };

  recognition.onend = () => {
    setIsListening(false);
  };

  recognition.start();
};

  // =====================================================
  // ANALYZE CROP
  // =====================================================

  const analyzeCrop = async () => {
    if (!crop || !location) {
      alert("Please select crop and enter location");
      return;
    }

    setLoading(true);
    setImageData(null);
    setShowActions(false);

    try {
      // =================================================
      // 1. CROP RISK ANALYSIS
      // =================================================

      const riskResponse = await fetch(
        `https://agrishield-ai-backend.onrender.com/risk?crop=${encodeURIComponent(
          crop
        )}&location=${encodeURIComponent(location)}`
      );

      if (!riskResponse.ok) {
        throw new Error("Risk analysis failed");
      }

      const riskResult = await riskResponse.json();

      // =================================================
      // 2. REAL WEATHER ANALYSIS
      // =================================================

      const weatherResponse = await fetch(
      `https://agrishield-ai-backend.onrender.com/weather?location=${encodeURIComponent(
         location
          )}`
         );

      if (!weatherResponse.ok) {
        throw new Error("Weather analysis failed");
      }

      const weatherResult = await weatherResponse.json();

      setWeatherData(weatherResult);

      // =================================================
      // 3. INITIAL RISK DATA
      // =================================================

      let finalDiseaseRisk = riskResult.disease_risk;
      let finalPestRisk = riskResult.pest_risk;
      let finalWeatherRisk = weatherResult.weather_risk;

      let finalOverallRisk = Math.round(
        (
          finalDiseaseRisk +
          finalPestRisk +
          finalWeatherRisk
        ) / 3
      );

      let finalCropHealth = Math.max(
        0,
        100 - finalOverallRisk
      );

      let finalAlert = "";
      let finalMessage = "";

      // =================================================
      // 4. AI IMAGE DISEASE ANALYSIS
      // =================================================

      if (image) {
        const formData = new FormData();

        formData.append("file", image);

        const imageResponse = await fetch(
        "https://agrishield-ai-backend.onrender.com/analyze-image",
          {
            method: "POST",
            body: formData,
          }
        );

        if (!imageResponse.ok) {
          throw new Error("Image analysis failed");
        }

        const imageResult = await imageResponse.json();

        setImageData(imageResult);

        // -----------------------------------------------
        // Use AI image disease risk
        // -----------------------------------------------

        if (typeof imageResult.disease_risk === "number") {
          finalDiseaseRisk = imageResult.disease_risk;

          /*
           * Final risk weighting:
           *
           * Disease = 50%
           * Weather = 30%
           * Pest    = 20%
           */

          finalOverallRisk = Math.round(
            finalDiseaseRisk * 0.5 +
            finalWeatherRisk * 0.3 +
            finalPestRisk * 0.2
          );

          finalCropHealth = Math.max(
            0,
            100 - finalOverallRisk
          );
        }
      }

      // =================================================
      // 5. FINAL ALERT
      // =================================================

      if (finalOverallRisk >= 70) {
        finalAlert = "High Risk";

        finalMessage =
          "Immediate preventive action is recommended.";
      } else if (finalOverallRisk >= 40) {
        finalAlert = "Medium Risk";

        finalMessage =
          "Monitor your crop closely and take preventive action.";
      } else {
        finalAlert = "Low Risk";

        finalMessage =
          "Crop condition looks relatively safe. Continue regular monitoring.";
      }

      // =================================================
      // 6. FIND MAJOR RISK CONTRIBUTOR
      // =================================================

      const riskValues = {
        Disease: finalDiseaseRisk,
        Pest: finalPestRisk,
        Weather: finalWeatherRisk,
      };

      const majorRisk = Object.keys(riskValues).reduce(
        (highest, current) =>
          riskValues[current] > riskValues[highest]
            ? current
            : highest
      );

      const majorRiskValue = riskValues[majorRisk];

      // =================================================
      // 7. RISK LEVEL FUNCTION
      // =================================================

      const getRiskLevel = (value) => {
        if (value >= 70) {
          return "high";
        }

        if (value >= 40) {
          return "moderate";
        }

        return "low";
      };

      const diseaseLevel =
        getRiskLevel(finalDiseaseRisk);

      const pestLevel =
        getRiskLevel(finalPestRisk);

      const weatherLevel =
        getRiskLevel(finalWeatherRisk);

      // =================================================
      // 8. REASON-BASED AI EXPLANATION
      // =================================================

      const riskFactors = [];

      // -----------------------------------------------
      // Disease explanation
      // -----------------------------------------------

      if (diseaseLevel === "high") {
        riskFactors.push(
          `Disease risk is high at ${finalDiseaseRisk}%. Disease symptoms should be monitored closely.`
        );
      } else if (diseaseLevel === "moderate") {
        riskFactors.push(
          `Disease risk is moderate at ${finalDiseaseRisk}%. Regular inspection of leaves is recommended.`
        );
      } else {
        riskFactors.push(
          `Disease risk is low at ${finalDiseaseRisk}%.`
        );
      }

      // -----------------------------------------------
      // Pest explanation
      // -----------------------------------------------

      if (pestLevel === "high") {
        riskFactors.push(
          `Pest risk is high at ${finalPestRisk}%. The crop should be checked for pest infestation.`
        );
      } else if (pestLevel === "moderate") {
        riskFactors.push(
          `Pest risk is moderate at ${finalPestRisk}%. Regular pest monitoring is recommended.`
        );
      } else {
        riskFactors.push(
          `Pest risk is low at ${finalPestRisk}%.`
        );
      }

      // -----------------------------------------------
      // Weather explanation
      // -----------------------------------------------

      if (weatherLevel === "high") {
        riskFactors.push(
          `Weather risk is high at ${finalWeatherRisk}%. Current weather conditions may increase crop stress.`
        );
      } else if (weatherLevel === "moderate") {
        riskFactors.push(
          `Weather risk is moderate at ${finalWeatherRisk}%. Weather conditions should be monitored.`
        );
      } else {
        riskFactors.push(
          `Weather risk is low at ${finalWeatherRisk}%.`
        );
      }

      // =================================================
      // 9. FINAL AI EXPLANATION
      // =================================================

      let riskExplanation = "";

      if (finalOverallRisk >= 70) {
        riskExplanation =
          `AI analysis indicates a high overall risk of ${finalOverallRisk}%. ` +
          riskFactors.join(" ") +
          ` The major contributor to the crop risk is ${majorRisk.toLowerCase()} risk at ${majorRiskValue}%. ` +
          `Immediate preventive action is recommended.`;
      } else if (finalOverallRisk >= 40) {
        riskExplanation =
          `AI analysis indicates a moderate overall risk of ${finalOverallRisk}%. ` +
          riskFactors.join(" ") +
          ` The major contributor to the crop risk is ${majorRisk.toLowerCase()} risk at ${majorRiskValue}%. ` +
          `Regular monitoring and preventive measures are recommended.`;
      } else {
        riskExplanation =
          `AI analysis indicates a low overall risk of ${finalOverallRisk}%. ` +
          riskFactors.join(" ") +
          ` The major contributor to the crop risk is ${majorRisk.toLowerCase()} risk at ${majorRiskValue}%. ` +
          `The crop appears relatively safe, but regular monitoring is recommended.`;
      }

      // =================================================
      // 10. DYNAMIC PREVENTIVE ACTIONS
      // =================================================

      const actions = [];

      // -----------------------------------------------
      // Disease actions
      // -----------------------------------------------

      if (finalDiseaseRisk >= 70) {
        actions.push(
          `Inspect ${crop.toLowerCase()} leaves and plants regularly for visible disease symptoms.`
        );

        actions.push(
          "Remove severely infected plant parts where appropriate to reduce disease spread."
        );
      } else if (finalDiseaseRisk >= 40) {
        actions.push(
          "Monitor the crop regularly for early disease symptoms."
        );
      } else {
        actions.push(
          "Continue routine disease monitoring."
        );
      }

      // -----------------------------------------------
      // Pest actions
      // -----------------------------------------------

      if (finalPestRisk >= 70) {
        actions.push(
          "Inspect leaves and stems frequently for pest infestation."
        );

        actions.push(
          "Use suitable pest-management measures if infestation is confirmed."
        );
      } else if (finalPestRisk >= 40) {
        actions.push(
          "Check the crop regularly for signs of pest activity."
        );
      } else {
        actions.push(
          "Continue routine pest monitoring."
        );
      }

      // -----------------------------------------------
      // Weather actions
      // -----------------------------------------------

      if (finalWeatherRisk >= 70) {
        actions.push(
          "Take precautions against current high-risk weather conditions."
        );

        actions.push(
          "Avoid unnecessary irrigation during periods of excessive moisture or rain."
        );
      } else if (finalWeatherRisk >= 40) {
        actions.push(
          "Monitor weather conditions and adjust irrigation accordingly."
        );
      } else {
        actions.push(
          "Maintain normal irrigation and monitor weather changes."
        );
      }

      // -----------------------------------------------
      // Crop-specific action
      // -----------------------------------------------

      const cropSpecificActions = {
        Wheat:
          "Regularly inspect wheat plants for leaf and stem problems.",

        Rice:
          "Maintain appropriate water levels and monitor rice plants for disease.",

        Potato:
          "Inspect potato leaves for disease symptoms and avoid excessive moisture.",

        Tomato:
          "Inspect tomato leaves regularly and avoid unnecessary overhead watering.",

        Maize:
          "Inspect maize leaves and stems for disease or pest damage.",
      };

      if (cropSpecificActions[crop]) {
        actions.push(
          cropSpecificActions[crop]
        );
      }
        
        // =================================================
// SMART RISK RECOMMENDATION
// =================================================

let priorityAction = "";

if (finalWeatherRisk >= 70) {
  priorityAction =
    "Priority: Weather risk is high. Avoid unnecessary irrigation and protect the crop from excessive rain or moisture.";
} 
else if (finalDiseaseRisk >= 70) {
  priorityAction =
    "Priority: Disease risk is high. Inspect leaves and remove severely infected plant parts where appropriate.";
} 
else if (finalPestRisk >= 70) {
  priorityAction =
    "Priority: Pest risk is high. Inspect leaves and stems for pest infestation and take suitable pest-management action if confirmed.";
} 
else if (finalOverallRisk >= 40) {
  priorityAction =
    "Priority: Moderate crop risk detected. Monitor disease, pests and weather conditions regularly.";
} 
else {
  priorityAction =
    "Priority: Crop risk is currently low. Continue regular monitoring.";
}

      // =================================================
      // 11. FINAL RISK OBJECT
      // =================================================

      const finalRisk = {
        ...riskResult,

        crop: crop,

        location: location,

        crop_health: finalCropHealth,

        disease_risk: finalDiseaseRisk,

        pest_risk: finalPestRisk,

        weather_risk: finalWeatherRisk,

        overall_risk: finalOverallRisk,

        alert: finalAlert,

        message: finalMessage,

          priority_action: priorityAction,

        preventive_actions: actions,

        risk_explanation: riskExplanation,
      };

      // =================================================
      // 12. SHOW FINAL RESULT
      // =================================================

      setRiskData(finalRisk);

      setAnalyzed(true);

    } catch (error) {
      console.error(
        "AgriShield AI Error:",
        error
      );

      alert(
        "Backend is not connected or image analysis failed."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FRONTEND
  // =====================================================

  return (
    <div style={styles.page}>

      {/* HEADER */}

      <header style={styles.header}>
        <h1 style={styles.logo}>
          🌱 AgriShield AI
        </h1>

        <p style={styles.subtitle}>
          AI-Powered Crop Loss Prevention System
        </p>
      </header>

      {/* MAIN */}

      <main style={styles.container}>

        <h2>Farmer Dashboard</h2>

        <p style={styles.description}>
          Get early warnings about crop disease,
          pest and weather risks.
        </p>
        <div style={styles.voiceCard}>

  <h2>🎙️ Voice Assistant</h2>

  <p>
    Ask AgriShield AI about your crop risk.
  </p>

  <button
    onClick={startVoiceAssistant}
    style={styles.voiceButton}
    disabled={isListening}
  >
    {isListening
      ? "🎙️ Listening..."
      : "🎤 Ask AgriShield AI"}
  </button>

  {voiceText && (
    <p style={styles.voiceText}>
      <b>You said:</b> {voiceText}
    </p>
  )}

</div>

        {/* ================================================= */}
        {/* CROP INFORMATION */}
        {/* ================================================= */}

        <section style={styles.formCard}>

          <h2>🌾 Crop Information</h2>

          <label>Crop</label>

          <select
            value={crop}
            onChange={(e) => {
              setCrop(e.target.value);
              setAnalyzed(false);
            }}
            style={styles.input}
          >
            <option value="">
              Select Crop
            </option>

            <option value="Wheat">
              Wheat
            </option>

            <option value="Rice">
              Rice
            </option>

            <option value="Potato">
              Potato
            </option>

            <option value="Tomato">
              Tomato
            </option>

            <option value="Maize">
              Maize
            </option>
          </select>

          <label>Location</label>

          <input
            type="text"
            placeholder="Enter village / city"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              setAnalyzed(false);
            }}
            style={styles.input}
          />

          <label>
            Upload Crop Image
          </label>

          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const selectedImage =
                e.target.files?.[0];

              setImage(
                selectedImage || null
              );

              setImageData(null);
              setAnalyzed(false);
            }}
            style={styles.input}
          />

          {image && (
            <p>
              📷 Selected:{" "}
              <b>{image.name}</b>
            </p>
          )}

          <button
            onClick={analyzeCrop}
            style={styles.button}
            disabled={loading}
          >
            {loading
              ? "⏳ Analyzing..."
              : "🔍 Analyze Crop"}
          </button>

        </section>

        {/* ================================================= */}
        {/* RESULTS */}
        {/* ================================================= */}

        {analyzed && riskData && (
          <section style={styles.resultCard}>

            <h2>
              📊 AI Risk Analysis
            </h2>

            {/* RISK CARDS */}

            <div style={styles.cards}>

  <div
    style={{
      ...styles.riskCard,
      borderTop: "5px solid #16a34a",
    }}
  >
    <p>🌱 Crop Health</p>

    <h2>
      {riskData.crop_health}/100
    </h2>

    <p style={{ color: "#16a34a", fontWeight: "bold" }}>
      Healthy Score
    </p>
  </div>

  <div
    style={{
      ...styles.riskCard,
      borderTop:
        riskData.disease_risk >= 70
          ? "5px solid #dc2626"
          : riskData.disease_risk >= 40
          ? "5px solid #f59e0b"
          : "5px solid #16a34a",
    }}
  >
    <p>🦠 Disease Risk</p>

    <h2>
      {riskData.disease_risk}%
    </h2>

    <p>
      {riskData.disease_risk >= 70
        ? "High Risk"
        : riskData.disease_risk >= 40
        ? "Moderate Risk"
        : "Low Risk"}
    </p>
  </div>

  <div
    style={{
      ...styles.riskCard,
      borderTop:
        riskData.pest_risk >= 70
          ? "5px solid #dc2626"
          : riskData.pest_risk >= 40
          ? "5px solid #f59e0b"
          : "5px solid #16a34a",
    }}
  >
    <p>🐛 Pest Risk</p>

    <h2>
      {riskData.pest_risk}%
    </h2>

    <p>
      {riskData.pest_risk >= 70
        ? "High Risk"
        : riskData.pest_risk >= 40
        ? "Moderate Risk"
        : "Low Risk"}
    </p>
  </div>

  <div
    style={{
      ...styles.riskCard,
      borderTop:
        riskData.weather_risk >= 70
          ? "5px solid #dc2626"
          : riskData.weather_risk >= 40
          ? "5px solid #f59e0b"
          : "5px solid #16a34a",
    }}
  >
    <p>🌦️ Weather Risk</p>

    <h2>
      {riskData.weather_risk}%
    </h2>

    <p>
      {riskData.weather_risk >= 70
        ? "High Risk"
        : riskData.weather_risk >= 40
        ? "Moderate Risk"
        : "Low Risk"}
    </p>
  </div>

</div>

           {/* ================================================= */}
{/* OVERALL RISK */}
{/* ================================================= */}

<div
  style={{
    ...styles.overallRiskCard,
    borderTop:
      riskData.overall_risk >= 70
        ? "6px solid #dc2626"
        : riskData.overall_risk >= 40
        ? "6px solid #f59e0b"
        : "6px solid #16a34a",
  }}
>
  <p>
    🌾 Overall Crop Risk
  </p>

  <h2
    style={{
      fontSize: "42px",
      margin: "10px 0",
    }}
  >
    {riskData.overall_risk}%
  </h2>

  <p
    style={{
      fontWeight: "bold",
      fontSize: "18px",
      color:
        riskData.overall_risk >= 70
          ? "#dc2626"
          : riskData.overall_risk >= 40
          ? "#f59e0b"
          : "#16a34a",
    }}
  >
    {riskData.overall_risk >= 70
      ? "🔴 High Risk"
      : riskData.overall_risk >= 40
      ? "🟡 Medium Risk"
      : "🟢 Low Risk"}
  </p>

  {/* RISK PROGRESS BAR */}

  <div
    style={{
      width: "100%",
      height: "14px",
      background: "#e5e7eb",
      borderRadius: "10px",
      overflow: "hidden",
      marginTop: "15px",
    }}
  >
    <div
      style={{
        width: `${riskData.overall_risk}%`,
        height: "100%",
        background:
          riskData.overall_risk >= 70
            ? "#dc2626"
            : riskData.overall_risk >= 40
            ? "#f59e0b"
            : "#16a34a",
        borderRadius: "10px",
        transition: "width 0.5s ease",
      }}
    />
  </div>

  <p
    style={{
      marginTop: "10px",
      fontSize: "14px",
      color: "#555",
    }}
  >
    Risk level is calculated from disease, pest and weather conditions.
  </p>
</div>

            {/* ================================================= */}
            {/* RISK ALERT + AI EXPLANATION */}
            {/* ================================================= */}

            <div style={styles.alert}>

              🚨{" "}
              <b>{riskData.alert}</b>

              <p>
                {riskData.message}
              </p>

              {riskData.risk_explanation && (
                <p>
                  🧠{" "}
                  <b>
                    AI Risk Explanation:
                  </b>{" "}
                  {riskData.risk_explanation}
                </p>
              )}

            </div>

            {/* ================================================= */}
            {/* WEATHER */}
            {/* ================================================= */}

            {weatherData && (
              <div style={styles.weatherCard}>

                <h2>
                  🌦️ Weather Information
                </h2>

                <p>
                  📍 Location:{" "}
                  <b>
                    {weatherData.location}
                  </b>
                </p>

                <p>
                  🌡️ Temperature:{" "}
                  <b>
                    {weatherData.temperature}°C
                  </b>
                </p>

                <p>
                  💧 Humidity:{" "}
                  <b>
                    {weatherData.humidity}%
                  </b>
                </p>

                <p>
                  🌧️ Rain Probability:{" "}
                  <b>
                    {weatherData.rain_probability}%
                  </b>
                </p>

                <p>
                  ⚠️ Weather Risk:{" "}
                  <b>
                    {weatherData.weather_risk}%
                  </b>
                </p>

                <p>
                  <b>
                    {weatherData.alert}
                  </b>
                </p>

                <p>
                  {weatherData.message}
                </p>

              </div>
            )}

            {/* ================================================= */}
            {/* PREVENTIVE ACTIONS */}
            {/* ================================================= */}

            <div style={styles.actionsCard}>

              <h2>
                🌱 Preventive Actions
              </h2>

              <button
                style={styles.actionButton}
                onClick={() =>
                  setShowActions(!showActions)
                }
              >
                💡{" "}
                {showActions
                  ? "Hide Preventive Actions"
                  : "View Preventive Actions"}
              </button>

              {showActions &&
                riskData.preventive_actions && (
                  <div style={styles.actionsBox}>

                    <ul>
                      {riskData.preventive_actions.map(
                        (action, index) => (
                          <li
                            key={index}
                            style={{
                              marginBottom:
                                "10px",
                            }}
                          >
                            {action}
                          </li>
                        )
                      )}
                    </ul>

                  </div>
                )}

            </div>

            {/* ================================================= */}
            {/* AI DISEASE DETECTION */}
            {/* ================================================= */}

            {imageData && (
              <div style={styles.imageResult}>

                <h2>
                  🤖 AI Disease Detection
                </h2>

                <p>
                  <b>Image:</b>{" "}
                  {imageData.filename}
                </p>

                <p>
                  <b>
                    Detected Disease:
                  </b>{" "}
                  {imageData.disease}
                </p>

                <p>
                  <b>
                    AI Confidence:
                  </b>{" "}
                  {imageData.confidence}%
                </p>

                <p>
                  <b>
                    Disease Risk:
                  </b>{" "}
                  {imageData.disease_risk}%
                </p>

                <p>
                  {imageData.message}
                </p>

              </div>
            )}

          </section>
        )}

      </main>
    </div>
  );
}


// =====================================================
// STYLES
// =====================================================

const styles = {

  page: {
    minHeight: "100vh",
    background: "#f1f8f4",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    background: "#166534",
    color: "white",
    padding: "25px 40px",
  },

  logo: {
    margin: 0,
    fontSize: "32px",
  },

  subtitle: {
    marginTop: "5px",
  },

  container: {
    maxWidth: "1100px",
    margin: "auto",
    padding: "35px 20px",
  },

  description: {
    color: "#555",
  },

  formCard: {
    background: "white",
    padding: "25px",
    marginTop: "25px",
    borderRadius: "15px",
    boxShadow:
      "0 3px 10px rgba(0,0,0,0.1)",
  },

  input: {
    display: "block",
    width: "100%",
    padding: "12px",
    marginTop: "8px",
    marginBottom: "20px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    boxSizing: "border-box",
  },

  button: {
    background: "#166534",
    color: "white",
    border: "none",
    padding: "12px 25px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
  },

  resultCard: {
    background: "white",
    padding: "25px",
    marginTop: "25px",
    borderRadius: "15px",
    boxShadow:
      "0 3px 10px rgba(0,0,0,0.1)",
  },

  cards: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, 1fr)",
    gap: "15px",
  },

  riskCard: {
    background: "#f8faf9",
    padding: "20px",
    borderRadius: "12px",
    textAlign: "center",
  },

  overallRiskCard: {
    marginTop: "20px",
    padding: "20px",
    background: "#f8faf9",
    borderRadius: "12px",
    textAlign: "center",
  },

  alert: {
    marginTop: "25px",
    padding: "20px",
    background: "#fff7ed",
    border:
      "1px solid #fb923c",
    borderRadius: "12px",
  },

  weatherCard: {
    marginTop: "25px",
    padding: "20px",
    background: "#eff6ff",
    border:
      "1px solid #93c5fd",
    borderRadius: "12px",
  },

  actionsCard: {
    marginTop: "25px",
    padding: "20px",
    background: "#f0fdf4",
    border:
      "1px solid #86efac",
    borderRadius: "12px",
  },

  actionButton: {
    background: "#166534",
    color: "white",
    border: "none",
    padding: "10px 18px",
    borderRadius: "8px",
    cursor: "pointer",
  },

  actionsBox: {
    marginTop: "15px",
    padding: "15px",
    background: "white",
    borderRadius: "10px",
    border:
      "1px solid #bbf7d0",
  },

  imageResult: {
    marginTop: "25px",
    padding: "20px",
    background: "#f0fdf4",
    borderRadius: "12px",
    border:
      "1px solid #86efac",
  },
    voiceCard: {
    marginTop: "25px",
    padding: "20px",
    background: "#ecfdf5",
    border: "1px solid #6ee7b7",
    borderRadius: "12px",
  },

  voiceButton: {
    background: "#166534",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
  },

  voiceText: {
    marginTop: "15px",
    padding: "12px",
    background: "white",
    borderRadius: "8px",
  },
};

export default App;