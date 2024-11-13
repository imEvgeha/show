import React, { useEffect } from "react";
import TourCard from "@/components/TourCard/TourCard";
import FiltersSection from "@/components/FiltersSection/FiltersSection";
import Loader from "@/components/Loader";
import { useDispatch, useSelector } from "react-redux";
import { loadProduct } from "@/thunks/productThunk";
import { toursData } from "@/reducers/toursReducer";
import { ITourDetails } from "@/interfaces/tourInterface";
import { useRouter } from "next/router";
import {
    checkIsAnyFiltersActive,
    clearFieldsState,
    deleteDataFromLocalStorage,
    generateStringForRequest,
    getStringFromUrl,
    getFilteredOrDefaultTours,
    getFromLocalStorage,
    getShortMonthName,
    removeDuplicateArrays,
    setErrorToLocalStorage,
    setValueToLocalStorage,
} from "@/helpers/global-helpers";
import { filtersData } from "@/reducers/filtersReducer";
import { productData } from "@/reducers/productReducer";
import { IProduct } from "@/interfaces/productInterface";
import { loadProductDates } from "@/thunks/productDatesThunk";
import { productDatesData } from "@/reducers/productDatesReducer";
import { setHotelData } from "@/actions/toursActions";
import { loadTours } from "@/thunks/toursThunk";
import {
    ALL_DEPARTURES_BY_SITE,
    BOOKING_ISSUE_LINK,
    CITY_BY_AIRPORT,
    CURRENCY_BY_DEPARTURE_FROM,
    DEPARTING_AIRPORTS,
    DEPARTURES_BY_SITE,
    NAME_BY_SITE,
} from "@/constants/global-constants";
import HeadTitle from "@/components/HeadTitle";
import { setFiltersState } from "@/actions/filtersActions";
import { personsAmountData } from "@/reducers/personsAmountReducer";
import { setPersonsAmount } from "@/actions/personsAmountActions";
import { setPaymentCurrency } from "@/actions/paymentActions";
import { IHotelAttributes } from "@/interfaces/hotelsInterface";
import { IDateForFilter } from "@/interfaces/filtersInterface";
import { setBookingGeo } from "@/actions/bookingActions";
import { clearAdditionalPayment } from "@/actions/additionalPaymentActions";
import { clearExcursionsValue } from "@/actions/excursionsActions";
import { useCookies } from "react-cookie";
import { useSiteIdContext } from "@/components/Layout";
import Head from "next/head";

function bookingDatesPrices() {
    const [cookies, setCookie] = useCookies();

    const router = useRouter();
    const dispatch = useDispatch();
    const siteId = useSiteIdContext();
    const tourState = useSelector(toursData);
    const filtersState = useSelector(filtersData);
    const productState = useSelector(productData);
    const productDates = useSelector(productDatesData);
    const personsAmount = useSelector(personsAmountData);

    const { productId } = router.query;
    const geoFromCookies = cookies.geo?.toLowerCase();
    const isAnyFiltersActive = checkIsAnyFiltersActive(filtersState);
    const tours = getFilteredOrDefaultTours(tourState, filtersState);
    const isProductDatesLoading = productDates.isProductDatesLoading;
    const defaultAirports =
        DEPARTING_AIRPORTS[geoFromCookies as keyof typeof DEPARTING_AIRPORTS];
    const defaultDeparture = defaultAirports?.map((item) => item.name);
    const defaultDepartureFrom =
        getFromLocalStorage("selectedDepartures") || defaultDeparture;

    const product: IProduct = productState.productInfo;
    const isToursLoading = tourState.isToursLoading;
    const hotelsList: IHotelAttributes[] =
        productState?.productInfo?.hotels || [];
    const showLoader =
        isToursLoading ||
        isProductDatesLoading ||
        (!tours?.length && !isAnyFiltersActive);
    const isNumbersInProductIdOnly =
        typeof productId === "string" ? /^\d+$/.test(productId) : false;

    useEffect(() => {
        deleteDataFromLocalStorage();
        clearFieldsState(dispatch);
        dispatch(clearAdditionalPayment());
        dispatch(clearExcursionsValue());
    }, []);

    useEffect(() => {
        if (product?.productId) {
            setValueToLocalStorage("productData", product);
        }
        if (productDates?.productDates?.length) {
            setValueToLocalStorage("productDates", productDates.productDates);
        }
    }, [product, productDates]);

    useEffect(() => {
        const { currency, passengers } = router.query;
        if (isNumbersInProductIdOnly && productId) {
            const currencyFromUrl = getStringFromUrl(currency);
            const departureForRequest = generateStringForRequest(
                DEPARTURES_BY_SITE[siteId as keyof typeof DEPARTURES_BY_SITE],
                "departure",
                "name"
            );
            const updatedPassengers = passengers ? +passengers : 0;
            const passengersForRequest = updatedPassengers
                ? `&passengers=${passengers}`
                : "";
            const currencyToLoadTour = currencyFromUrl ? currencyFromUrl : "";
            const additionalParams = `${departureForRequest}${passengersForRequest}`;
            const newProductId = +productId;
            dispatch(
                loadTours(
                    newProductId,
                    false,
                    additionalParams,
                    currencyToLoadTour
                )
            );
            dispatch(loadProduct(newProductId));
            dispatch(
                loadProductDates(
                    newProductId,
                    currency ||
                        CURRENCY_BY_DEPARTURE_FROM[
                            (geoFromCookies as keyof typeof CURRENCY_BY_DEPARTURE_FROM) ||
                                "roi"
                        ]
                )
            );
        } else if (productId !== undefined) {
            setErrorToLocalStorage(
                "useEffect to load data on booking-dates-prices page",
                `productId is wrong value - ProductId: ${productId}`
            );
            router.push(BOOKING_ISSUE_LINK);
        }
    }, [productId]);

    useEffect(() => {
        tours?.forEach?.((tour) => {
            if (tour.tourId && tour.tourHotels.length) {
                dispatch(
                    setHotelData({
                        hotelData: tour.tourHotels[0],
                        tourId: tour.tourId,
                    })
                );
            }
        });
    }, [tours?.length]);

    useEffect(() => {
        const { departure, passengers, currency, hotel, date, tourId } =
            router.query;
        const queryPersonsAmount = Number(passengers) || 2;
        const newFiltersState: any = {
            dateFilter: [],
            hotelFilter: {
                hotels: [],
                rating: [],
            },
            departureFilter: [],
        };

        if (typeof hotel === "string")
            newFiltersState.hotelFilter.hotels = getHotelFilter(hotel)
                ? [getHotelFilter(hotel)]
                : [];
        if (typeof date === "string")
            newFiltersState.dateFilter = getDateFilter(date);
        if (typeof departure === "string")
            newFiltersState.departureFilter = getDepartureFilter(departure);
        if (typeof departure !== "string")
            newFiltersState.departureFilter = getDepartureFilter(
                typeof defaultDepartureFrom === "object"
                    ? defaultDepartureFrom?.join(",")
                    : defaultDepartureFrom
            );

        const isAvailable =
            Boolean(date) === Boolean(newFiltersState.dateFilter.length) &&
            Boolean(hotel) ===
                Boolean(
                    newFiltersState.hotelFilter.hotels.filter(
                        (elem: any) => elem
                    ).length
                );
        isAvailable && dispatch(setFiltersState(newFiltersState));

        if (queryPersonsAmount !== personsAmount && queryPersonsAmount !== 0)
            checkAndSetPersonsAmount(queryPersonsAmount);
        if (typeof currency === "string") checkAndSetCurrency(currency);
        if (typeof tourId === "string") checkAndSetTourId(tourId);
        setValueToLocalStorage("initialPath", router.asPath);
    }, [router.query, hotelsList.length]);

    useEffect(() => {
        const { geo, productId } = router.query;

        if (geo === undefined || typeof geo === "string")
            checkAndSetDepartureFilterByGeo(geo, productId);
    }, [router.query.geo, geoFromCookies]);

    const checkAndSetTourId = (tourId: string) => {
        router.push(`/booking-room-selection?tourid=${tourId}`);
    };

    const checkAndSetDepartureFilterByGeo = (
        geo: string | undefined,
        productId: any
    ) => {
        const updatedGeo: any =
            geo === undefined ? geoFromCookies || "roi" : geo.toLowerCase();
        const defaultAirports =
            DEPARTING_AIRPORTS[updatedGeo as keyof typeof DEPARTING_AIRPORTS];
        const departure = defaultAirports?.map((item) => item.name);
        const currency =
            CURRENCY_BY_DEPARTURE_FROM[
                updatedGeo as keyof typeof CURRENCY_BY_DEPARTURE_FROM
            ];

        dispatch(setBookingGeo(updatedGeo));
        setValueToLocalStorage("bookingGeo", updatedGeo);

        if (productId) {
            router.push({
                pathname: router.pathname,
                query: {
                    ...router.query,
                    currency: currency,
                    departure: departure?.join(","),
                    productId: productId,
                },
            });
        }
    };

    const getDepartureFilter = (departure: string) => {
        const newArray: any[] = [];
        departure?.length &&
            departure.split(",").forEach((item) => {
                newArray.push(
                    ALL_DEPARTURES_BY_SITE.find((departure) => {
                        return (
                            departure.cityName ===
                            CITY_BY_AIRPORT[
                                item as keyof typeof CITY_BY_AIRPORT
                            ]
                        );
                    })
                );
            });
        const newDeparture = departure?.length ? newArray : [];
        return newDeparture.filter((item) => item);
    };

    const checkAndSetPersonsAmount = (queryPersonsAmount: number) => {
        dispatch(
            setPersonsAmount({
                value: queryPersonsAmount,
                label: `${queryPersonsAmount}`,
            })
        );
    };

    const checkAndSetCurrency = (currency: string) => {
        dispatch(setPaymentCurrency(currency ? currency : "EUR"));
    };

    const getHotelFilter = (hotel: string) => {
        const currentHotel = hotelsList.find(
            (hotelFromList) => +hotelFromList.hotelId === +hotel
        );
        return currentHotel;
    };

    const getDateFilter = (date: string) => {
        const currentDate = new Date();

        if (!date)
            return {
                specificDate: [],
                month: [],
                year: currentDate.getFullYear(),
            };

        const dateArray = date.split(",").length ? date.split(",") : [date];
        const newDate: IDateForFilter[] = dateArray.map((item) => {
            const separateDatesArray = item.split("-");
            switch (separateDatesArray.length) {
                case 1:
                    return {
                        specificDate: [],
                        month: [],
                        year: +separateDatesArray[0],
                    };
                case 2:
                    return {
                        specificDate: [],
                        month: [
                            getShortMonthName(+separateDatesArray[0] - 1 || 0),
                        ],
                        year: +separateDatesArray[1],
                    };
                case 3:
                    return {
                        specificDate: [
                            new Date(
                                `${+separateDatesArray[1]}-${
                                    separateDatesArray[0]
                                }-${separateDatesArray[2]}`
                            ).getTime(),
                        ],
                        month: [
                            getShortMonthName(+separateDatesArray[1] - 1 || 0),
                        ],
                        year: +separateDatesArray[2],
                    };

                default:
                    return {
                        specificDate: [],
                        month: [],
                        year: currentDate.getFullYear(),
                    };
            }
        });

        return removeDuplicateArrays(
            newDate.filter((date) => date.year >= new Date().getFullYear())
        );
    };

    return (
        <main className="relative">
            <Head>
                <title>
                    Booking Dates & Prices |{" "}
                    {NAME_BY_SITE[siteId as keyof typeof NAME_BY_SITE]}
                </title>
            </Head>

            <FiltersSection />
            {showLoader ? (
                <Loader />
            ) : (
                <div>
                    <HeadTitle
                        tag="h1"
                        textStyle="text-left my-7 text-2xl md:text-3xl xl:text-custom-big"
                        title={`Options Available (${tours?.length || 0})`}
                    />

                    <div
                        className={`grid grid-cols-1 md:grid-cols-2 3xl:grid-cols-3 gap-4 lg:gap-7 mb-4 min-h-[15rem]`}
                    >
                        {tours?.map((item: ITourDetails) => {
                            return (
                                <TourCard
                                    tour={item}
                                    product={product}
                                    key={item?.key}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </main>
    );
}

export default bookingDatesPrices;
