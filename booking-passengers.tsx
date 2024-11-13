import React, { useEffect } from "react";
import PassengersSection from "@/components/BookingPassengers/PassengersSection";
import SeparatorLine from "@/components/SeparatorLine";
import AddressSection from "@/components/BookingPassengers/AddressSection";
import SpecialRequirements from "@/components/BookingPassengers/SpecialRequirements";
import BookingPassengersFooter from "@/components/BookingPassengers/BookingPassengersFooter";
import { SubmitHandler, useForm } from "react-hook-form";
import { useRouter } from "next/router";
import { updateBookingDetails } from "@/thunks/bookingThunk";
import { useDispatch, useSelector } from "react-redux";
import { bookingData } from "@/reducers/bookingReducer";
import { IBookingState } from "@/interfaces/bookingInterface";
import { passengersData } from "@/reducers/passengerDetailsReducer";
import { IPassengersState } from "@/interfaces/passengerDetailsInterface";
import { contactAddressData } from "@/reducers/contactAddressReducer";
import { IContactAddressState } from "@/interfaces/contactAddressInterface";
import { baggageData } from "@/reducers/baggageReducer";
import { insuranceData } from "@/reducers/insuranceReducer";
import { IExcursion } from "@/interfaces/excursionsInterface";
import { excursionsData } from "@/reducers/excursionsReducer";
import {
    BOOKING_ISSUE_LINK,
    BOOKING_PAYMENT_LINK,
    FIRST_PASSENGER_FIELDS,
    NAME_BY_SITE,
} from "@/constants/global-constants";
import { personsAmountData } from "@/reducers/personsAmountReducer";
import { ITourDetails, IToursState } from "@/interfaces/tourInterface";
import { toursData } from "@/reducers/toursReducer";
import {
    checkIsBookingStarted,
    getDataFromLocalStorage,
    setErrorToLocalStorage,
} from "@/helpers/global-helpers";
import EmergencyContactDetails from "@/components/BookingPassengers/EmegrancyContactDetails";
import { specialRequirementsData } from "@/reducers/specialRequirementsReducer";
import { ISpecialRequirementsState } from "@/interfaces/specialRequirementsInterface";
import {
    setPassengerData,
    setPassengerDataError,
} from "@/actions/passengerDetailsActions";
import {
    changeCity,
    changeCountry,
    changeEircode,
    changeFirstAddress,
    changeSecondAddress,
} from "@/actions/contactAddressActions";
import {
    setAccommodation,
    setAirportOrFlightRequests,
    setMobilityLimitations,
    setSpecialRequests,
} from "@/actions/specialRequirementsActions";
import Head from "next/head";
import { useSiteIdContext } from "@/components/Layout";

function bookingPassengers() {
    const siteId = useSiteIdContext();
    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        control,
        setError,
    } = useForm();
    const router = useRouter();
    const dispatch = useDispatch();
    const baggage = useSelector(baggageData);
    const insurance = useSelector(insuranceData);
    const bookingState: IBookingState = useSelector(bookingData);
    const personsAmount: number = useSelector(personsAmountData);
    const passengersState: IPassengersState = useSelector(passengersData);
    const excursionsState: IExcursion[] = useSelector(excursionsData);
    const specialRequirementsState: ISpecialRequirementsState = useSelector(
        specialRequirementsData
    );
    const contactAddress: IContactAddressState =
        useSelector(contactAddressData);

    const bookingContent = bookingState?.bookingDetails?.content;
    const bookingId = bookingContent?.booking_id;
    const sessionId = bookingContent?.sessionId;
    const passengers = passengersState.value;
    const leadPassenger = passengers[0];
    const otherPassengers = [...passengers].map((item) => ({
        title: item.title.label,
        firstName: item.firstName,
        surname: item.surname,
    }));
    otherPassengers.shift();

    const filteredExcursions = excursionsState.filter((item) => item.selected);
    const excursions = filteredExcursions.map((excursion) => ({
        id: `${excursion.excursionId}`,
        quantity: `${excursion.excursionPeopleAmount}`,
    }));

    const extras = [...Array(personsAmount)].map((passenger, index) => {
        return {
            passengerIndex: index,
            insuranceId: +insurance[index]?.insuranceValue?.value || 0,
            extraId: 0,
            bags:
                baggage[index]?.baggageValue?.price &&
                baggage[index]?.baggageValue?.value
                    ? [
                          {
                              price: `${baggage[index].baggageValue.price}`,
                              weight: `${baggage[index].baggageValue.value}`,
                          },
                      ]
                    : [],
        };
    });

    const tourState: IToursState = useSelector(toursData);
    const selectedTour: ITourDetails | null = tourState.selectedTour;

    const handleUnsuccessSubmit = (data: any) => {
        const fieldFromError = JSON.parse(data.errorContent).errors?.[0].field;
        if (fieldFromError) {
            dispatch(
                setPassengerDataError(`Field ${fieldFromError} is not valid.`)
            );
        } else {
            router.push(BOOKING_ISSUE_LINK);
        }
        setErrorToLocalStorage(
            "bookingPassengers submit, response is not successful",
            data.errorContent
        );
    };

    const submit: SubmitHandler<any> = (data) => {
        if (bookingId && sessionId) {
            document.dispatchEvent(
                new CustomEvent("td-event-passenger-details", {
                    detail: {
                        tour: selectedTour,
                        pax: personsAmount,
                        leadPassenger: leadPassenger,
                    },
                })
            );

            dispatch(
                updateBookingDetails(bookingId, {
                    sessionId: sessionId,
                    leadPassenger: {
                        title: leadPassenger.title.label,
                        firstName: leadPassenger.firstName,
                        surname: leadPassenger.surname,
                        email: leadPassenger.email,
                        homePhone: "-",
                        mobile: leadPassenger.mobilePhoneNumber,
                        address1: contactAddress.firstAddress,
                        address2: contactAddress.secondAddress,
                        address3: contactAddress.city,
                        address4: contactAddress.country.label,
                        postcode: contactAddress.eircode,
                        emergencyContact:
                            specialRequirementsState.emergencyContactNumber,
                        emergencyContactName:
                            specialRequirementsState.emergencyContactName,
                        signUps: leadPassenger.receiveEmailOffers
                            ? "Yes"
                            : "No",
                        btSignUps: leadPassenger.receiveEmailOffers
                            ? "Yes"
                            : "No",
                    },
                    passengers: otherPassengers,
                    excursions,
                    extras,
                    accommodationRequest: null,
                    flightAirportRequest: null,
                })
            )
                .then((data: any) => {
                    data.isSuccessful
                        ? router.push(BOOKING_PAYMENT_LINK)
                        : handleUnsuccessSubmit(data);
                })
                .catch((error: any) => {
                    setErrorToLocalStorage(
                        "bookingPassengers submit, updateBookingDetails function",
                        error
                    );
                    router.push(BOOKING_ISSUE_LINK);
                });
        } else {
            setErrorToLocalStorage(
                "bookingPassengers submit function",
                `We don't have bookingId or sessionId. bookingId: ${bookingId}, sessionId: ${sessionId}`
            );
            router.push(BOOKING_ISSUE_LINK);
        }
    };

    useEffect(() => {
        checkIsBookingStarted(router);
    }, [selectedTour]);

    useEffect(() => {
        const {
            passengerDetails,
            firstAddress,
            secondAddress,
            city,
            country,
            eircode,
            mobilityLimitations,
            specialRequests,
            accommodation,
            airportOrFlightRequests,
        } = getDataFromLocalStorage();
        // passenger-details-page
        passengerDetails && dispatch(setPassengerData(passengerDetails));

        // passenger-details contact address
        firstAddress && dispatch(changeFirstAddress(firstAddress));
        secondAddress && dispatch(changeSecondAddress(secondAddress));
        city && dispatch(changeCity(city));
        country && dispatch(changeCountry(country));
        eircode && dispatch(changeEircode(eircode));

        // passenger-details special requests
        mobilityLimitations &&
            dispatch(setMobilityLimitations(mobilityLimitations));
        specialRequests && dispatch(setSpecialRequests(specialRequests));
        accommodation && dispatch(setAccommodation(accommodation));
        airportOrFlightRequests &&
            dispatch(setAirportOrFlightRequests(airportOrFlightRequests));

        passengerDetails &&
            passengerDetails?.value?.forEach?.(
                (passenger: any, index: number) => {
                    Object.keys(passenger).forEach((key) => {
                        if (key === "passengerIndex") return;

                        FIRST_PASSENGER_FIELDS.forEach((item: any) => {
                            const customSelectName =
                                item.inputTitle +
                                (index === 0
                                    ? "PersonLeadSelect"
                                    : `Person${index}Select`);
                            const fieldName =
                                item.inputTitle +
                                (index === 0 ? "PersonLead" : `Person${index}`);

                            setValue(fieldName, passenger[item.inputName]);
                            setValue(customSelectName, passenger.title);
                        });
                    });
                }
            );
    }, []);

    return (
        <main>
            <Head>
                <title>
                    Booking Passengers |{" "}
                    {NAME_BY_SITE[siteId as keyof typeof NAME_BY_SITE]}{" "}
                </title>
            </Head>

            <form onSubmit={handleSubmit(submit)}>
                <PassengersSection
                    setError={setError}
                    register={register}
                    validationSchema={{
                        required: "This value is required",
                    }}
                    errors={errors}
                    control={control}
                />

                <AddressSection
                    register={register}
                    validationSchema={{
                        required: "This value is required",
                    }}
                    errors={errors}
                    control={control}
                />
                <SeparatorLine />

                <EmergencyContactDetails
                    passengersAmount={personsAmount}
                    register={register}
                    validationSchema={{
                        required: "This value is required",
                    }}
                    errors={errors}
                    control={control}
                />

                <SpecialRequirements />

                <div className="flex justify-center">
                    {passengersState.error ? (
                        <div
                            className={`mt-2 px-4 py-1 bg-custom-rose text-black font-normal w-fit text-center `}
                        >
                            {passengersState.error}
                        </div>
                    ) : null}
                </div>

                <BookingPassengersFooter
                    isLoading={bookingState.isBookingUpdateLoading}
                />
            </form>
        </main>
    );
}

export default bookingPassengers;
