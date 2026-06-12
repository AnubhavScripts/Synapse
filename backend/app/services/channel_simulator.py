import random
import uuid

# Channel-specific probabilities (outcome rates)
CHANNEL_RATES = {
    "whatsapp": {"delivery": 0.97, "read": 0.78, "click": 0.28, "convert": 0.12},
    "sms": {"delivery": 0.95, "read": 0.45, "click": 0.12, "convert": 0.05},
    "email": {"delivery": 0.92, "read": 0.22, "click": 0.08, "convert": 0.03},
    "rcs": {"delivery": 0.90, "read": 0.65, "click": 0.22, "convert": 0.09},
}


def simulate_customer_journey(channel: str, customer_id: uuid.UUID) -> dict:
    """
    Generates outcome probabilities for a single message send.
    Determines delivery, read, click, and conversion success,
    as well as transient failure flags.
    """
    rates = CHANNEL_RATES.get(channel.lower(), CHANNEL_RATES["whatsapp"])

    # 15% chance of transient failure (requiring dispatcher/transport retries)
    is_transient_failure = random.random() < 0.15
    transient_error = "Carrier gateway timeout" if is_transient_failure else None

    is_delivered = random.random() < rates["delivery"]
    is_read = False
    is_clicked = False
    is_converted = False
    revenue = 0.0
    failure_reason = None

    if is_delivered:
        is_read = random.random() < rates["read"]
        if is_read:
            is_clicked = random.random() < rates["click"]
            if is_clicked:
                is_converted = random.random() < rates["convert"]
                if is_converted:
                    revenue = round(random.uniform(500, 5000), 2)
    else:
        failure_reason = random.choice(
            [
                "Invalid phone number or address",
                "Handset unreachable or power off",
                "Carrier delivery spam block",
                "SMS gateway network timeout",
            ]
        )

    return {
        "is_transient_failure": is_transient_failure,
        "transient_error": transient_error,
        "is_delivered": is_delivered,
        "is_read": is_read,
        "is_clicked": is_clicked,
        "is_converted": is_converted,
        "revenue": revenue,
        "failure_reason": failure_reason,
    }
